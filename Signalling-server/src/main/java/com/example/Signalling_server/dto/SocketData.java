package com.example.Signalling_server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class SocketData {

    private String roomId;

    private String instanceId;
}
