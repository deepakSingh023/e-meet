package com.example.Signalling_server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class SocketData {
   

    private String roomId;

    private String instanceId;
}
