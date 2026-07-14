package com.example.Signalling_server.controller;


import com.example.Signalling_server.dto.MetaDataResponse;
import com.example.Signalling_server.dto.ProfileResponse;
import com.example.Signalling_server.service.ProfileService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.naming.AuthenticationNotSupportedException;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    @PostMapping("/update")
    public ResponseEntity<String> updateProfile(
            Authentication authentication,
            @RequestParam("file") MultipartFile file
    ){
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select a file to upload");
        }

        String url = profileService.updateProfile(authentication.getName(), file);

        return ResponseEntity.ok(url);


    }

    @PostMapping("/update-metadata")
    public ResponseEntity<Void> updateMetaData(
            Authentication authentication,
            @RequestParam String roomId

    ){
        String userId = authentication.getName();

        profileService.setMetadata(userId,roomId);

        return ResponseEntity.ok().build();

    }

    @GetMapping("/get-metadata")
    public ResponseEntity<MetaDataResponse> getMetadata(
            Authentication authentication,
            @RequestParam String roomId
    ){

        String userId = authentication.getName();

        MetaDataResponse dataResponse = profileService.getMetadata(roomId,userId);

        return ResponseEntity.ok(dataResponse);

    }

}
