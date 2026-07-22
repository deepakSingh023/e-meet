package com.example.Signalling_server.service;

import com.example.Signalling_server.dto.MetaDataResponse;
import com.example.Signalling_server.dto.RoomMetadata;
import com.example.Signalling_server.entity.User;
import com.example.Signalling_server.repository.AuthRepository;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;
import java.util.UUID;

@RequiredArgsConstructor
@Service
public class ProfileService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String UPLOAD_DIR = "/app/uploads/avatars/";

    private final AuthRepository authRepository;

    public String updateProfile(String userId, MultipartFile file) {

        User user = authRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));


        try {
            File directory = new File(UPLOAD_DIR);
            if (!directory.exists()) {
                directory.mkdirs();
            }


            String uniqueFileName = UUID.randomUUID().toString() + ".jpg";
            Path path = Paths.get(UPLOAD_DIR + uniqueFileName);

            Thumbnails.of(file.getInputStream())
                    .size(150, 150)
                    .outputQuality(0.80)
                    .outputFormat("jpg")
                    .toFile(path.toFile());

            String publicAvatarUrl = "/images/" + uniqueFileName;
            user.setAvatar(publicAvatarUrl);
            authRepository.save(user);

            return publicAvatarUrl;

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to process image file");
        }

    }

    public void setMetadata(String userId, String roomId) {
        String redisKey = "room-metadata:" + roomId;

        User user = null;

        if (userId != null) {
            user = authRepository.findById(userId).orElse(null);
        }

        String currentUserId = (user != null) ? user.getId() : null;
        String currentName = (user != null && user.getUsername() != null) ? user.getUsername() : "unknown";
        String currentAvatar = (user != null && user.getAvatar() != null) ? user.getAvatar() : "default.png";

        RoomMetadata metadata = (RoomMetadata) redisTemplate.opsForValue().get(redisKey);

        if (metadata == null) {
            metadata = RoomMetadata.builder()
                    .user1Id(currentUserId)
                    .user1Name(currentName)
                    .user1Avatar(currentAvatar)
                    .build();
        } else {
            metadata.setUser2Id(currentUserId);
            metadata.setUser2Name(currentName);
            metadata.setUser2Avatar(currentAvatar);
        }

        redisTemplate.opsForValue().set(redisKey, metadata, 2, java.util.concurrent.TimeUnit.HOURS);
    }

    public MetaDataResponse getMetadata(String roomId, String userId) {

        String redisKey = "room-metadata:" + roomId;

        RoomMetadata data =
                (RoomMetadata) redisTemplate.opsForValue().get(redisKey);

        if (data == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "data not found in redis"
            );
        }

        if (data.getUser1Id() == null && data.getUser2Id() == null) {
            return new MetaDataResponse(
                    null,
                    "unknown",
                    "default.png"
            );
        }

        if (Objects.equals(data.getUser1Id(), userId)) {
            return new MetaDataResponse(
                    data.getUser2Id(),
                    data.getUser2Name(),
                    data.getUser2Avatar()
            );
        }

        if (Objects.equals(data.getUser2Id(), userId)) {
            return new MetaDataResponse(
                    data.getUser1Id(),
                    data.getUser1Name(),
                    data.getUser1Avatar()
            );
        }

        // Anonymous caller (or user not found in room)
        return new MetaDataResponse(
                data.getUser1Id(),
                data.getUser1Name(),
                data.getUser1Avatar()
        );
    }
}

