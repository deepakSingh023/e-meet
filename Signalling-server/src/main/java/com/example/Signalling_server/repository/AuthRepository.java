package com.example.Signalling_server.repository;

import com.example.Signalling_server.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AuthRepository extends MongoRepository<User,String> {

    boolean existsByEmail(String mail);

    Optional<User> findByEmail(String s);
}
