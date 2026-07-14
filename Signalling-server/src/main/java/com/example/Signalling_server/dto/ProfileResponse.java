package com.example.Signalling_server.dto;

public record ProfileResponse(
        String userId,

        String profilePic,

        String username
) {
}
