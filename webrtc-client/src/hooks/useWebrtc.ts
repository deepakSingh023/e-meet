import { useEffect, useRef, useState } from "react";
import { createPeerConnection } from "../service/webrtc";
import { socket } from "../service/websockets";

export type PeerDataType = "LOCAL" | "REMOTE" | null;

/**
 * Owns the RTCPeerConnection instance, the local/remote video refs,
 * the media-readiness + ICE queue refs, and wires up all the
 * peer-connection-level listeners plus the local getUserMedia setup.
 *
 * Signaling (socket message handling) lives in useSocketHandlers -
 * this hook only knows about the peer connection and local media.
 */
export function useWebRTC(roomId: string | undefined) {
    const [isPeerConnected, setIsPeerConnected] = useState(false);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const peerDataType = useRef<PeerDataType>(null);

    if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection();
    }

    const peerConnection = peerConnectionRef.current;

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const isMediaReady = useRef(false);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        // 1. REGISTER PEER LISTENERS IMMEDIATELY
        peerConnection.ontrack = async (event) => {

            console.log("========== ONTRACK ==========");
            console.log(event.track.kind);
            console.log(event.streams.length);

            if (!remoteVideoRef.current) {
                console.log("video ref null");
                return;
            }

            remoteVideoRef.current.srcObject = event.streams[0];

            try {
                await remoteVideoRef.current.play();
                console.log("video playing");
            } catch (e) {
                console.error(e);
            }

            console.log(remoteVideoRef.current.readyState);
            console.log(remoteVideoRef.current.videoWidth);
            console.log(remoteVideoRef.current.videoHeight);

            setIsPeerConnected(true);
        };

        peerConnection.onconnectionstatechange = () => {
            console.log(peerConnection.connectionState);
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log(peerConnection.iceConnectionState);
        };

        peerConnection.onsignalingstatechange = () => {
            console.log(peerConnection.signalingState);
        };

        peerConnection.onicegatheringstatechange = () => {
            console.log(peerConnection.iceGatheringState);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(
                    JSON.stringify({
                        type: "ICE_CANDIDATE",
                        roomId,
                        payload: event.candidate
                    })
                );
            }
        };

        // 2. RUN ASYNC CAMERA SETUP
        const setup = async () => {
            try {
                console.log("Starting getUserMedia...");

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                console.log("Camera and microphone granted.");

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                stream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, stream);
                    console.log(
                        "Added",
                        peerConnection.getSenders().length,
                        "tracks"
                    );
                });

                console.log(
                    "Total senders:",
                    peerConnection.getSenders().length
                );

                isMediaReady.current = true;
            } catch (error) {
                console.warn("No camera/mic access, running in RECEIVE-ONLY mode.");
                isMediaReady.current = true;
            }
        };

        setup();

        // 3. CLEANUP ON DISCONNECT
        return () => {
            console.log("Cleaning up resources...");

            const stream = localVideoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            peerConnection.close();
            peerConnectionRef.current = null;
        };
    }, [roomId, peerConnection]);

    return {
        peerConnection,
        peerDataType,
        localVideoRef,
        remoteVideoRef,
        isMediaReady,
        iceCandidatesQueue,
        isPeerConnected
    };
}