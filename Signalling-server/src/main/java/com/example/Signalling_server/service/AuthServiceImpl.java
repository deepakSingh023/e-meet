package com.example.Signalling_server.service;

import com.example.Signalling_server.dto.AuthRequest;
import com.example.Signalling_server.dto.AuthResponse;
import com.example.Signalling_server.dto.LoginRequest;
import com.example.Signalling_server.entity.User;
import com.example.Signalling_server.repository.AuthRepository;
import com.example.Signalling_server.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;


@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final PasswordEncoder passwordEncoder;

    private final JwtUtils jwtUtils;

    private final AuthRepository authRepository;

    @Override
    public AuthResponse registerUser(AuthRequest req){

        if(req.email() == null || req.email().isBlank()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"the request does not include email ");
        }

        if(req.username() == null || req.username().isBlank()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"the request does not include username");
        }

        if(req.password() == null || req.password().isBlank()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"the request does not include password ");
        }

        if(authRepository.existsByEmail(req.email())){
            throw new ResponseStatusException(HttpStatus.CONFLICT,"email already exists");
        }

        User user = User.builder()
                .email(req.email())
                .username(req.username())
                .password(passwordEncoder.encode(req.password()))
                .createdAt(Instant.now())
                .build();

        authRepository.save(user);

        return new AuthResponse(user.getId(), user.getUsername(), jwtUtils.generateToken(user.getId() , user.getEmail()));

    }

    @Override
    public AuthResponse loginUser(LoginRequest req){

        if(req.email() == null || req.email().isBlank()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"the request does not include email ");
        }

        if(req.password() == null || req.password().isBlank()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"the request does not include password ");
        }

        User user = authRepository.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"user not found"));

        if(!passwordEncoder.matches(req.password(), user.getPassword())){
            throw  new ResponseStatusException(HttpStatus.UNAUTHORIZED,"the user password is wrong");
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail());

        return new AuthResponse(user.getId(), user.getUsername(), token);

    }
}
