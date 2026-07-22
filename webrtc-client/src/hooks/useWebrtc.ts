import { useEffect, useRef, useState, useCallback } from "react";
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
 *
 * Screen share rides on the SAME peer connection as a second video
 * track (added/removed by useScreenShare). ontrack tells camera and
 * screen-share tracks apart by stream id: the very first stream we
 * ever receive is treated as "the camera stream", anything else is
 * treated as a screen share.
 */
export function useWebRTC(roomId: string | undefined) {
    const [isPeerConnected, setIsPeerConnected] = useState(false);
    const [isRemoteSharingScreen, setIsRemoteSharingScreen] = useState(false);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const peerDataType = useRef<PeerDataType>(null);

    if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection();
    }

    const peerConnection = peerConnectionRef.current;

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteScreenVideoRef = useRef<HTMLVideoElement>(null);
    const remoteScreenStreamRef = useRef<MediaStream | null>(null);

    const isMediaReady = useRef(false);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
    const remoteCameraStreamIdRef = useRef<string | null>(null);

    const clearRemoteScreenShare = useCallback(() => {
    
        if (remoteScreenStreamRef.current) {
            remoteScreenStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
        }
    
        remoteScreenStreamRef.current = null;
    
        if (remoteScreenVideoRef.current) {
            remoteScreenVideoRef.current.pause();
            remoteScreenVideoRef.current.srcObject = null;
            remoteScreenVideoRef.current.load();
        }
    
        setIsRemoteSharingScreen(false);
    
    }, []);

    useEffect(() => {
        // 1. REGISTER PEER LISTENERS IMMEDIATELY
        peerConnection.ontrack = async (event) => {
            const incomingStream = event.streams[0];

            console.log("========== ONTRACK ==========");
            console.log(event.track.kind, incomingStream?.id);
            console.log(event.streams.length);

            // First stream we ever see is treated as the camera/mic stream.
            if (!remoteCameraStreamIdRef.current && incomingStream) {
                remoteCameraStreamIdRef.current = incomingStream.id;
            }

            const isScreenShareStream =
                incomingStream && incomingStream.id !== remoteCameraStreamIdRef.current;

            if (isScreenShareStream) {
                console.log("Treating incoming stream as SCREEN SHARE");
            
                remoteScreenStreamRef.current = incomingStream;
            
                setIsRemoteSharingScreen(true);
            
                event.track.onended = () => {
                    console.log("Remote screen-share track ended");
                    clearRemoteScreenShare();
                };
            
                return;
            }

            if (!remoteVideoRef.current) {
                console.log("video ref null");
                return;
            }

            remoteVideoRef.current.srcObject = incomingStream;

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


                console.log("Dedicated screen sender created");
                console.log(
                    "Total senders after screen transceiver:",
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

            remoteCameraStreamIdRef.current = null;

            peerConnection.close();
            peerConnectionRef.current = null;
        };
    }, [roomId, peerConnection]);

    useEffect(() => {
        if (!isRemoteSharingScreen) return;
        if (!remoteScreenVideoRef.current) return;
        if (!remoteScreenStreamRef.current) return;
    
        remoteScreenVideoRef.current.srcObject = remoteScreenStreamRef.current;
    
        remoteScreenVideoRef.current.play().catch(console.error);
    }, [isRemoteSharingScreen]);

    return {
        peerConnection,
        peerDataType,
        localVideoRef,
        remoteVideoRef,
        remoteScreenVideoRef,
        isMediaReady,
        iceCandidatesQueue,
        isPeerConnected,
        isRemoteSharingScreen,
        clearRemoteScreenShare,
    };
}