package com.example.Signalling_server.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.socket.WebSocketSession;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Room {

    private String roomId;

    private String hostId;

    private boolean hostReady;

    private String guestId;

    private boolean guestReady;

    public Room(
            String roomId,
            String hostId
    ) {
        this.roomId = roomId;
        this.hostId = hostId;
    }
}