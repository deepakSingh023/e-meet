package com.example.Signalling_server.repository;

import com.example.Signalling_server.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuthRepository extends MongoRepository<User,String> {
}
