package com.example.Signalling_server.service;

import com.example.Signalling_server.dto.AuthRequest;
import com.example.Signalling_server.dto.AuthResponse;
import com.example.Signalling_server.dto.LoginRequest;

public interface AuthService {

    AuthResponse registerUser(AuthRequest req);

     AuthResponse loginUser(LoginRequest req);

}
