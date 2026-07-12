package com.example.Signalling_server.service;


import com.example.Signalling_server.dto.Room;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;


@Service
public class RoomService {

    private final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final RedisTemplate<String, Object> redisTemplate;

    private final RedissonClient redissonClient;


    RoomService(RedisTemplate<String, Object> redisTemplate,
                RedissonClient redissonClient){
        this.redisTemplate = redisTemplate;
        this.redissonClient = redissonClient;

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
                            WebSocketSession guest){

        RLock lock =
                redissonClient.getLock("room-lock:" + roomId);



        try {
            if (!lock.tryLock(2, 5, TimeUnit.SECONDS)) {
                return false;
            }

            Room room = getRoom(roomId);

            if (room == null) {
                return false;
            }

            if (room.getGuestId() != null) {
                return false;
            }

            sessionMap.put(
                    guest.getId(),
                    guest
            );

            room.setGuestId(
                    guest.getId()
            );

            redisTemplate.opsForValue().set(
                    "room:" + roomId,
                    room
            );

            return true;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();
            return false;
        }finally {

            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }

        }
    }

    public Room getRoom(
            String roomId
    ) {
          return  (Room) redisTemplate.opsForValue().get("room:" + roomId);
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

        redisTemplate.opsForValue().set("room:" + room.getRoomId(),room);

        return room.isHostReady() && room.isGuestReady();
    }

    public WebSocketSession provideSession(String id){

        return sessionMap.get(id);
    }

    public boolean existsInSocket(String socketId){

        if (socketId == null) {
            return false;
        }
        return sessionMap.get(socketId) != null;
    }



    public String cleanupRoom(Room room, String disconnectedSocketId) {

        RLock lock = redissonClient.getLock("room-lock:" + room.getRoomId());

        try {

            if (!lock.tryLock(2, 5, TimeUnit.SECONDS)) {
                return null;
            }

            Room current = getRoom(room.getRoomId());

            if (current == null) {
                return null;
            }

            String peerId;

            if (disconnectedSocketId.equals(current.getHostId())) {

                peerId = current.getGuestId();

            } else if (disconnectedSocketId.equals(current.getGuestId())) {

                peerId = current.getHostId();

            } else {

                return null;

            }

            sessionMap.remove(disconnectedSocketId);
            redisTemplate.delete("socket:" + disconnectedSocketId);
            redisTemplate.delete("room:" + current.getRoomId());

            return peerId;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();
            return null;

        } finally {

            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }

        }
    }

    public String endCall(Room room, String callerSocketId) {

        RLock lock = redissonClient.getLock("room-lock:" + room.getRoomId());

        try {

            if (!lock.tryLock(2, 5, TimeUnit.SECONDS)) {
                return null;
            }

            Room current = getRoom(room.getRoomId());

            if (current == null) {
                return null;
            }

            String peerId;

            if (callerSocketId.equals(current.getHostId())) {

                peerId = current.getGuestId();

            } else if (callerSocketId.equals(current.getGuestId())) {

                peerId = current.getHostId();

            } else {

                return null;

            }

            sessionMap.remove(callerSocketId);
            redisTemplate.delete("socket:" + callerSocketId);
            redisTemplate.delete("room:" + current.getRoomId());

            return peerId;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();
            return null;

        } finally {

            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }

        }
    }



}