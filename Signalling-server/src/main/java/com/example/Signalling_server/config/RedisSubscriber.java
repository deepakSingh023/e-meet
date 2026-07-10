package com.example.Signalling_server.config;

import com.example.Signalling_server.dto.RedisSignalMessage;
import com.example.Signalling_server.dto.SocketData;
import com.example.Signalling_server.service.RoomService;
import com.example.Signalling_server.utils.SocketSender;
import com.example.Signalling_server.websocket.SignalingHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class RedisSubscriber implements MessageListener {

    private final RoomService roomService;
    private final ObjectMapper mapper;
    private final SocketSender socketSender;

    public RedisSubscriber(RoomService roomService,
                           ObjectMapper mapper, SocketSender socketSender) {
        this.roomService = roomService;
        this.mapper = mapper;
        this.socketSender = socketSender;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {

        try {

            RedisSignalMessage redisMessage =
                    mapper.readValue(
                            message.getBody(),
                            RedisSignalMessage.class
                    );

            WebSocketSession session =
                    roomService.provideSession(
                            redisMessage.targetSocketId()
                    );

            if(session == null || !session.isOpen()){
                return;
            }

            socketSender.send(
                    session,
                    redisMessage.signalMessage()
            );



        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}