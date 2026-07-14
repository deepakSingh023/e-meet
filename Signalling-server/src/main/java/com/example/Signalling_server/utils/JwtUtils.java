package com.example.Signalling_server.utils;


import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String SECRET;

    private final Long EXPIRATION_TIME = 1000L * 60 * 60 * 24 * 7;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String userId, String email) {
        return Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUserId(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // Check expiration manually
            Date expiration = claims.getExpiration();
            if (expiration != null && expiration.before(new Date())) {
                throw new RuntimeException("Token has expired");
            }

            return claims.getSubject(); // userId stored in subject
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token has expired");
        } catch (JwtException e) {
            throw new RuntimeException("Invalid token");
        }
    }


    public boolean isTokenValid(String token) {
        try {
            extractUserId(token); // will throw if invalid/expired
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }
}



