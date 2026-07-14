package com.example.Signalling_server.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoomMetadata {

    String user1Id;

    String user1Name;

    String user1Avatar;

    String user2Id;

    String user2Name;

    String user2Avatar;
}
