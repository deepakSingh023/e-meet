package com.example.Signalling_server.controller;


import com.example.Signalling_server.dto.AuthRequest;
import com.example.Signalling_server.dto.AuthResponse;
import com.example.Signalling_server.dto.LoginRequest;
import com.example.Signalling_server.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestBody AuthRequest data
            ){
        AuthResponse res = authService.registerUser(data);

        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
     public ResponseEntity<AuthResponse> login(
             @RequestBody LoginRequest req
             ){
        AuthResponse res = authService.loginUser(req);

        return ResponseEntity.ok(res);
     }
}
