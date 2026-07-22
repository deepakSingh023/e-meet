package com.example.Signalling_server.utils;

import com.example.Signalling_server.dto.SignalMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Service
public class SocketSender {

    private final ObjectMapper mapper;

    public SocketSender(ObjectMapper mapper){
        this.mapper = mapper;
    }

    public void send(
            WebSocketSession session,
            SignalMessage msg
    ) throws Exception {

        if (session == null || !session.isOpen()) {
            return;
        }

        synchronized (session) {
            session.sendMessage(
                    new TextMessage(
                            mapper.writeValueAsString(msg)
                    )
            );
        }
    }
}