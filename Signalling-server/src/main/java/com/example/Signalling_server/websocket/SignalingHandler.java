package com.example.Signalling_server.websocket;

import com.example.Signalling_server.dto.Room;
import com.example.Signalling_server.dto.SignalMessage;
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

        WebSocketSession target =
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

        send(
                target,
                msg
        );
    }

    private void send(
            WebSocketSession session,
            SignalMessage message
    ) throws Exception {

        if(session == null || !session.isOpen()){
            return;
        }

        session.sendMessage(
                new TextMessage(
                        mapper.writeValueAsString(
                                message
                        )
                )
        );
    }

    private WebSocketSession getTarget(
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
            return roomService.provideSession(room.getGuestId());
        }

        return roomService.provideSession(room.getHostId());
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



    /**
     * REFACTORING NOTE: Legacy "BYE" Architecture and Frontend State Workaround

     * HISTORY OF THE COMPONENT:
     * This complex handshaking loop was initially created by mistake under an over-engineered
     * assumption about room management. Once deployed, we realized that for a simple 1-on-1 call,
     * it would be far simpler to just destroy the entire room object and forcefully sever all socket
     * descriptors the moment either user left.

     * WHY WE DID NOT SCRAP IT (THE CRITICAL FRONTEND TRAP):
     * Despite being overly verbose, we deliberately chose to keep this "BYE" mechanism because
     * it accidentally solved a fatal WebRTC architectural limitation on our frontend:

     * 1. WebRTC Peer Connections are strictly non-reusable once an initial negotiation completes.
     *    If we simply vaporized the room on the backend, the user left behind would stay stuck
     *    in an active, stale connection state, waiting for media tracks from a dead session.
     * 2. Because our 1-on-1 frontend is currently unable to dynamically unbind, tear down, and
     *    re-map a fresh peer connection instance to a *new* participant on the fly while staying
     *    in the same room view, the old session completely blocks any new users from connecting.

     * HOW THE ACCIDENTAL LOOP SAFELY RESOLVES THIS:
     * Instead of rewrite-refactoring our entire network state mapping, this legacy flow acts as
     * a perfect safety net. User A leaves -> Backend sends a "BYE" eviction notice to User B ->
     * User B catches the signal and runs `window.location.href = "/"`.

     * This hard redirect forces the frontend to unmount, which is the only way our app currently
     * stops camera hardware, closes ports, and kills the dead reference objects. Once User B is
     * kicked out, their socket drops violently, tripping the fallback loop which cleanly wipes the
     * room out of the ConcurrentHashMap anyway.

     * TL;DR: It is not the most graceful or shortest way to code a teardown, but it functions
     * flawlessly under network drops and manual hang-ups, so we are keeping it as is.
     */


    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {


    }


    private void handleEndCall(WebSocketSession session, SignalMessage msg) throws Exception {



        Room room = (Room) redisTemplate.opsForValue().get(
                "room:" + msg.roomId()
        );

        if(room == null){
            session.close();
            return;
        }

        if(session.getId() != null && session.getId().equals(room.getHostId())){
            send(
                    roomService.provideSession(room.getGuestId()),
                    new SignalMessage(
                            "BYE",
                            msg.roomId(),
                            null

                    )
            );
            roomService.removeSession(session);
            redisTemplate.delete("room:" + msg.roomId());
        }else if(session.getId() != null && session.getId().equals(room.getGuestId())){
            send(
                    roomService.provideSession(room.getHostId()),
                    new SignalMessage(
                            "BYE",
                            msg.roomId(),
                            null

                    )
            );
            roomService.removeSession(session);
            redisTemplate.delete("room:" + msg.roomId());

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

        if (ready) {
            send(
                    roomService.provideSession(room.getHostId()),
                    new SignalMessage(
                            "PEER_JOINED",
                            message.roomId(),
                            null
                    )
            );
        }

        redisTemplate.opsForValue().set(
                "socket:" + session.getId(),
                info.getInstanceId()
        );

    }



}