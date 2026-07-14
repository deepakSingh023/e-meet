package com.example.Signalling_server.entity;


import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;


@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@Document("user")
public class User {

    @Id
    private String id;

    private String password;

    private String username;

    private String avatar;

    private String email;

    private Instant createdAt;
}
