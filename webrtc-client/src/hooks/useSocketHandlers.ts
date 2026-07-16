import { useEffect, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { socket } from "../service/websockets";
import { processQueuedCandidates } from "../utils/processCandidates";
import { getRoomMetadata, resolveAvatarUrl } from "../api/profileApi";
import type { RemotePeer } from "../types/profile";
import type { PeerDataType } from "./useWebrtc";

interface UseSocketHandlersParams {
    roomId: string | undefined;
    peerConnection: RTCPeerConnection;
    peerDataType: MutableRefObject<PeerDataType>;
    isMediaReady: MutableRefObject<boolean>;
    iceCandidatesQueue: MutableRefObject<RTCIceCandidateInit[]>;
    remoteVideoRef: RefObject<HTMLVideoElement>;
}

/**
 * Sends READY on mount and handles every incoming signaling message
 * (PEER_JOINED / OFFER / ANSWER / ICE_CANDIDATE / BYE). Pure signaling -
 * the actual peer connection setup lives in useWebRTC.
 *
 * Also resolves who's on the other end of the call. Only the receiver
 * gets an OFFER and only the sender gets an ANSWER, so fetching
 * /api/profile/get-metadata in both of those cases (instead of just one)
 * covers both roles — each side fetches it exactly once, right when it
 * has confirmation the peer is actually in the room.
 */
export function useSocketHandlers({
    roomId,
    peerConnection,
    peerDataType,
    isMediaReady,
    iceCandidatesQueue,
    remoteVideoRef
}: UseSocketHandlersParams) {

    const [remotePeer, setRemotePeer] = useState<RemotePeer | null>(null);

    useEffect(() => {

        // Best-effort: doesn't block or delay signaling either way. If it fails
        // (guest room, metadata not yet set, etc.) the UI just falls back to a
        // generic label/avatar for the remote panel.
        const fetchRemotePeer = () => {
            if (!roomId) return;
            getRoomMetadata(roomId)
                .then((meta) => {
                    setRemotePeer({
                        userId: meta.userId,
                        username: meta.username || "Guest",
                        avatarUrl: resolveAvatarUrl(meta.avatar),
                    });
                })
                .catch((err) => {
                    console.warn("Could not fetch remote peer metadata:", err);
                });
        };

        const handleReadySocket = () => {
            console.log("WebSocket is open and ready for communication.");
            socket.send(
                JSON.stringify({
                    type: "READY",
                    roomId,
                    payload: null
                })
            );
        };

        handleReadySocket();

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log("Incoming WebSocket Message:", data.type);

            switch (data.type) {
                case "PEER_JOINED":

                    if (!isMediaReady.current) {
                        console.warn("Peer joined too fast! Camera not ready.");
                        break;
                    }

                    console.log(
                        "PEER_JOINED",
                        "mediaReady=",
                        isMediaReady.current,
                        "senders=",
                        peerConnection.getSenders().length
                    );

                    peerDataType.current = "LOCAL";

                    try {
                        const offer = await peerConnection.createOffer();
                        await peerConnection.setLocalDescription(offer);
                        socket.send(
                            JSON.stringify({
                                type: "OFFER",
                                roomId,
                                payload: offer
                            })
                        );
                    } catch (error) {
                        console.error("OFFER ERROR", error);
                    }
                    break;

                case "OFFER":
                    console.log("Offer received");

                    peerDataType.current = "REMOTE";

                    // Receiver's turn to learn who sent the offer
                    fetchRemotePeer();

                    try {
                        console.log(isMediaReady.current);

                        while (!isMediaReady.current) {
                            await new Promise(r => setTimeout(r, 20));
                        }

                        await peerConnection.setRemoteDescription(data.payload);
                        console.log("Remote description set successfully.");
                        await processQueuedCandidates(peerConnection, iceCandidatesQueue);
                        console.log("Queued ICE candidates processed successfully.");

                        const answer = await peerConnection.createAnswer();
                        console.log("Answer created successfully.");
                        await peerConnection.setLocalDescription(answer);
                        console.log("Local description set successfully.");

                        socket.send(
                            JSON.stringify({
                                type: "ANSWER",
                                roomId,
                                payload: answer
                            })
                        );

                        console.log("Answer sent successfully.");
                    } catch (error) {
                        console.error("Error handling offer:", error);
                    }
                    break;

                case "ANSWER":
                    console.log("Answer received");

                    // Sender's turn to learn who answered
                    fetchRemotePeer();

                    try {
                        await peerConnection.setRemoteDescription(data.payload);
                        console.log("Remote description set successfully.");
                        await processQueuedCandidates(peerConnection, iceCandidatesQueue);
                        console.log("Queued ICE candidates processed successfully.");
                    } catch (error) {
                        console.error("Error handling answer:", error);
                    }
                    break;

                case "ICE_CANDIDATE":
                    console.log("ICE Candidate received");
                    if (!peerConnection.remoteDescription) {
                        console.warn("Remote description not ready yet. Queueing candidate.");
                        iceCandidatesQueue.current.push(data.payload);
                        break;
                    }
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload));
                    } catch (error) {
                        console.error("Error adding candidate:", error);
                    }
                    break;

                case "BYE":
                    console.log("Peer has left the room.");

                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }

                    peerConnection.close();

                    window.location.href = "/";

                    alert("The other participant has left the call.");
                    break;

                default:
                    console.warn("Unknown message type", data.type);
            }
        };

        return () => {
            socket.onmessage = null;
        };

    }, [roomId, peerConnection, peerDataType, isMediaReady, iceCandidatesQueue, remoteVideoRef]);

    return { remotePeer };
}