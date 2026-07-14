package com.example.Signalling_server.dto;

public record AuthRequest(
        String username,

        String email,

        String password
) {
}
