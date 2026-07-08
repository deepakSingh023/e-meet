package com.example.Signalling_server.entity;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;


@Data
@AllArgsConstructor
@NoArgsConstructor
@Document("user")
public class User {

    private String id;

    private String password;

    private String username;

    private String email;

    private Instant createdAt;
}
