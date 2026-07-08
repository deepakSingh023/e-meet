package com.example.Signalling_server.service;

import com.example.Signalling_server.dto.Room;
import com.example.Signalling_server.dto.SignalMessage;
import com.example.Signalling_server.dto.SocketData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;


@Service
public class RoomService {

    private final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final RedisTemplate<String, Object> redisTemplate;


    RoomService(RedisTemplate<String, Object> redisTemplate){
        this.redisTemplate = redisTemplate;

    }

    private final Map<String, WebSocketSession> sessionMap =
            new ConcurrentHashMap<>();


    public String createRoom(
            WebSocketSession host
    ){
        String roomId = UUID.randomUUID().toString().substring(0,6);

        Room room =
                new Room(roomId, host.getId());

        redisTemplate.opsForValue().set(
                "room:" + roomId,
                room
        );

        sessionMap.put(host.getId(),host);

        return roomId;

    }

    public boolean joinRoom(String roomId,
                            WebSocketSession guest) {

        Room room = (Room) redisTemplate.opsForValue().get(roomId);

        if (room == null) {
            return false;
        }

        if (room.getGuestId() != null) {
            return false;
        }

        sessionMap.put(guest.getId(), guest);

        room.setGuestId(guest.getId());
        redisTemplate.opsForValue().set("room:" + roomId,room);

        return true;
    }

    public Room getRoom(
            String roomId
    ) {
          return  (Room) redisTemplate.opsForValue().get(roomId);
    }


    public void removeSession(WebSocketSession session) {
        sessionMap.remove(session.getId());
        redisTemplate.delete("socket:" + session.getId());

    }

    public boolean markReadyStatus(WebSocketSession session, Room room) {

        if (room == null) {
            return false;
        }

        if (room.getHostId() != null &&
                room.getHostId().equals(session.getId())) {

            room.setHostReady(true);

            log.info(
                    "Host ready roomId={}",
                    room.getRoomId()
            );

        } else if (room.getGuestId() != null &&
                room.getGuestId().equals(session.getId())) {

            room.setGuestReady(true);
            log.info(
                    "Guest ready roomId={}",
                    room.getRoomId()
            );
        }
        log.info(
                "Ready state roomId={} hostReady={} guestReady={}",
                room.getRoomId(),
                room.isHostReady(),
                room.isGuestReady()
        );

        return room.isHostReady() && room.isGuestReady();
    }

    public WebSocketSession provideSession(String id){
        return sessionMap.get(id);
    }



}