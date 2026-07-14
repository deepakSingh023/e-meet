package com.example.Signalling_server.dto;

public record LoginRequest(

        String userId,

        String email,

        String password
) {
}
