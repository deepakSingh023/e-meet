package com.example.Signalling_server.dto;

public record RedisSignalMessage(

        String targetSocketId,

        SignalMessage signalMessage

) {}