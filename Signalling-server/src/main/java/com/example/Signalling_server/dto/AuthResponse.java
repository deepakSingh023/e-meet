package com.example.Signalling_server.dto;

public record AuthResponse(
        String userId,

        String username,

        String token
) {
}
