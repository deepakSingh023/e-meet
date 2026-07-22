package com.example.Signalling_server.websocket;

import com.example.Signalling_server.config.RedisSubscriber;
import com.example.Signalling_server.dto.RedisSignalMessage;
import com.example.Signalling_server.dto.Room;
import com.example.Signalling_server.dto.SignalMessage;
import com.example.Signalling_server.dto.SocketData;
import com.example.Signalling_server.service.RoomService;
import com.example.Signalling_server.utils.InstanceInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class SignalingHandler extends TextWebSocketHandler {

    private final RoomService roomService;

    private final ObjectMapper mapper;

    private final Logger log = LoggerFactory.getLogger(SignalingHandler.class);

    private final InstanceInfo info;

    private final RedisTemplate<String,Object> redisTemplate;



    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage message
    ) throws Exception {

        SignalMessage msg =
                mapper.readValue(
                        message.getPayload(),
                        SignalMessage.class
                );

        log.info(
                "Received={} roomId={}",
                msg.type(),
                msg.roomId()
        );

        switch (msg.type()) {

            case "CREATE_ROOM" -> handleCreateRoom(session);

            case "READY" -> handleUserReady(
                    session,
                    msg
            );

            case "JOIN_ROOM" -> handleJoinRoom(
                    session,
                    msg
            );

            case "OFFER",
                 "ANSWER",
                 "ICE_CANDIDATE" -> relayMessage(
                    session,
                    msg
                 );

            case "VIDEO_ENABLED"-> relayState(session,msg,"VIDEO_ENABLED");
            case "VIDEO_DISABLED" -> relayState(session,msg,"VIDEO_DISABLED");

            case "SCREEN_SHARE_STARTED" -> relayState(session,msg,"SCREEN_SHARE_STARTED");
            case "SCREEN_SHARE_STOPPED" -> relayState(session,msg,"SCREEN_SHARE_STOPPED");
            case "END_CALL" -> handleEndCall(session, msg);
        }
    }

    private void handleCreateRoom(
            WebSocketSession session
    ) throws Exception {

        String roomId =
                roomService.createRoom(
                        session
                );

        send(
                session,
                new SignalMessage(
                        "ROOM_CREATED",
                        roomId,
                        null
                )
        );
    }

    private void handleJoinRoom(
            WebSocketSession session,
            SignalMessage msg
    ) throws Exception {

        boolean joined =
                roomService.joinRoom(
                        msg.roomId(),
                        session
                );

        send(
                session,
                new SignalMessage(
                        joined
                                ? "JOIN_SUCCESS"
                                : "JOIN_FAILED",
                        msg.roomId(),
                        null
                )
        );

    }

    private void relayMessage(
            WebSocketSession sender,
            SignalMessage msg
    ) throws Exception {

        Room room =
                roomService.getRoom(
                        msg.roomId()
                );

        if (room == null) {
            return;
        }

        String  target =
                getTarget(
                        room,
                        sender
                );

        if (target == null) {
            return;
        }

        log.info(
                "Relaying={} roomId={}",
                msg.type(),
                msg.roomId()
        );


        if(roomService.existsInSocket(target)){
            send(
                    roomService.provideSession(target),
                    msg
            );

        }else{

            SocketData instance =(SocketData) redisTemplate.opsForValue().get("socket:" + target);

            if (instance == null) {
                return;
            }

            redisTemplate.convertAndSend(
                    "signal:" + instance.getInstanceId(),
                    new RedisSignalMessage(target,msg)
            );
        }


    }

    private void send(
            WebSocketSession session,
            SignalMessage message
    ) throws Exception {

        if(session == null || !session.isOpen()){
            return;
        }

        log.info(
            "Sending {} to {} thread={}",
            message.type(),
            session.getId(),
            Thread.currentThread().getName()
        );

        synchronized (session) {
            session.sendMessage(
                    new TextMessage(
                            mapper.writeValueAsString(message)
                    )
            );
        }
    }

    private String getTarget(
            Room room,
            WebSocketSession sender
    ) {

        if (room == null) {
            return null;
        }

        if (
                room.getHostId() != null
                        &&
                        sender.getId().equals(
                                room.getHostId()
                        )
        ) {
            return room.getGuestId();
        }

        return room.getHostId();
    }

    @Override
    public void afterConnectionEstablished(
            WebSocketSession session
    ) {

        log.info(
                "Connected={} "
                        ,session.getId()
        );
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) throws Exception {

        SocketData data =
                (SocketData) redisTemplate.opsForValue()
                        .get("socket:" + session.getId());

        if (data == null) {
            roomService.removeSession(session);
            return;
        }

        Room room = roomService.getRoom(data.getRoomId());

        if (room == null) {

            roomService.removeSession(session);
            return;
        }

        String peerId =
                roomService.cleanupRoom(room, session.getId());

        if (peerId == null) {
            return;
        }

        if (roomService.existsInSocket(peerId)) {

            send(
                    roomService.provideSession(peerId),
                    new SignalMessage(
                            "BYE",
                            room.getRoomId(),
                            null
                    )
            );

        } else {

            SocketData peer =
                    (SocketData) redisTemplate.opsForValue()
                            .get("socket:" + peerId);

            if (peer != null) {

                redisTemplate.convertAndSend(
                        "signal:" + peer.getInstanceId(),
                        new RedisSignalMessage(
                                peerId,
                                new SignalMessage(
                                        "BYE",
                                        room.getRoomId(),
                                        null
                                )
                        )
                );
            }
        }
    }


    private void handleEndCall(WebSocketSession session, SignalMessage msg) throws Exception {

        Room room = roomService.getRoom(msg.roomId());

        if (room == null) {

            roomService.removeSession(session);
            session.close();
            return;

        }

        String peerId =
                roomService.endCall(room, session.getId());

        if (peerId == null) {

            session.close();
            return;

        }

        if (roomService.existsInSocket(peerId)) {

            send(
                    roomService.provideSession(peerId),
                    new SignalMessage(
                            "BYE",
                            room.getRoomId(),
                            null
                    )
            );

        } else {

            SocketData peer =
                    (SocketData) redisTemplate.opsForValue()
                            .get("socket:" + peerId);

            if (peer != null) {

                redisTemplate.convertAndSend(
                        "signal:" + peer.getInstanceId(),
                        new RedisSignalMessage(
                                peerId,
                                new SignalMessage(
                                        "BYE",
                                        room.getRoomId(),
                                        null
                                )
                        )
                );

            }

        }

        session.close();


    }

    private void handleUserReady(WebSocketSession session , SignalMessage message)throws Exception{

        Room room = roomService.getRoom(message.roomId());

        if (room == null) {
            return;
        }

        //Passing the room to the service to avoid another search to get the room
        boolean ready = roomService.markReadyStatus(session, room);

        redisTemplate.opsForValue().set(
                "socket:" + session.getId(),
                new SocketData(message.roomId(),info.getInstanceId())
        );

        if (ready) {

            if(roomService.existsInSocket(room.getHostId())){
                send(
                        roomService.provideSession(room.getHostId()),
                        new SignalMessage(
                                "PEER_JOINED",
                                message.roomId(),
                                null
                        )
                );

            } else {
                SocketData data = (SocketData) redisTemplate.opsForValue().get("socket:" + room.getHostId());

                if(data == null){
                    return;
                }

                redisTemplate.convertAndSend(
                        "signal:" + data.getInstanceId(),
                        new RedisSignalMessage(room.getHostId(),new SignalMessage("PEER_JOINED", message.roomId(),null))
                );


            }

        }



    }

    private void relayState(
            WebSocketSession session,
            SignalMessage msg,
            String event
    ) throws Exception{

        Room room = roomService.getRoom(msg.roomId());

        if(room == null){
            return;
        }

        String otherId = room.getHostId().equals(session.getId())
                ? room.getGuestId()
                : room.getHostId();

        WebSocketSession otherUser = roomService.provideSession(otherId);

        if (otherUser == null) {
            return;
        }


        send(
                otherUser,
                new SignalMessage(
                        event,
                        room.getRoomId(),
                        null
                )
        );

    }



}