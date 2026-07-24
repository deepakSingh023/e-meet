import { useEffect, useRef, useState } from "react";
import { socket } from "../service/websockets";
/**
 * Screen share rides on the SAME RTCPeerConnection as the camera call -
 * it's just a second video track, added/removed via addTrack/removeTrack.
 * Adding or removing that track requires a fresh offer/answer round trip
 * (renegotiation), which we send as a normal "OFFER" - useSocketHandlers'
 * existing OFFER/ANSWER handling deals with it exactly like the initial
 * call setup, no special-casing needed there.
 */

export function useScreenShare(
    peerConnection: RTCPeerConnection,
    roomId: string | undefined
) {
    const [isSharingScreen, setIsSharingScreen] = useState(false);

    const localScreenVideoRef = useRef<HTMLVideoElement>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const screenSenderRef = useRef<RTCRtpSender | null>(null);

    const renegotiate = async () => {
        try {
            console.log("Creating renegotiation offer...");

            console.log("Senders:", peerConnection.getSenders().length);
            console.log("Transceivers:", peerConnection.getTransceivers().length);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            const message = JSON.stringify({
                type: "OFFER",
                roomId,
                payload: offer
            });
            
            console.log("Offer size:", message.length);
            
            socket.send(message);

            console.log("OFFER SENT");
        } catch (error) {
            console.error("SCREEN SHARE RENEGOTIATION ERROR", error);
        }
    };

    const stopScreenShare = async () => {
        if (!screenSenderRef.current) return;

        console.log("Stopping screen share");

        socket.send(
            JSON.stringify({
                type: "SCREEN_SHARE_STOPPED",
                roomId,
                payload: null
            })
        );

        console.log(
            peerConnection.getSenders().map((s, i) => ({
                index: i,
                kind: s.track?.kind,
                id: s.track?.id
            }))
        );

        peerConnection.removeTrack(screenSenderRef.current);
        
        console.log(
            "After removeTrack:",
            peerConnection.getSenders().length,
            peerConnection.getTransceivers().length
        );
        
        //screenSenderRef.current = null;

        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;

        if (localScreenVideoRef.current) {
            localScreenVideoRef.current.srcObject = null;
        }

        setIsSharingScreen(false);

        await renegotiate();
    };

    const startScreenShare = async () => {
        try {
            console.log("Requesting screen share...");

            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const [screenTrack] = stream.getVideoTracks();

            screenStreamRef.current = stream;

            if (localScreenVideoRef.current) {
                localScreenVideoRef.current.srcObject = stream;
            }
            
            const reusableSender = findReusableScreenSender();
            
            if (reusableSender) {
                console.log("Reusing inactive sender");
            
                await reusableSender.replaceTrack(screenTrack);

                const transceiver = peerConnection
                    .getTransceivers()
                    .find(t => t.sender === reusableSender);
                
                if (transceiver) {
                    transceiver.direction = "sendrecv";
                }
                
                console.log(
                    reusableSender.transport,
                    reusableSender.track,
                    reusableSender.track?.kind
                );
            
                
                console.log(
                    "direction",
                    transceiver?.direction,
                    "current",
                    transceiver?.currentDirection
                );
                screenSenderRef.current = reusableSender;
            } else {
                console.log("Creating new sender");
            
                screenSenderRef.current = peerConnection.addTrack(
                    screenTrack,
                    stream
                );


                console.log(
                    "After addTrack:",
                    peerConnection.getSenders().length,
                    peerConnection.getTransceivers().length
                );
            }
            setIsSharingScreen(true);

            socket.send(
                JSON.stringify({
                    type: "SCREEN_SHARE_STARTED",
                    roomId,
                    payload: null
                })
            );

            // Fires if the user stops sharing via the browser's native
            // "Stop sharing" bar instead of our own button.
            screenTrack.onended = () => {
                stopScreenShare();
            };

            await renegotiate();
        } catch (error) {
            console.warn("Screen share cancelled or failed:", error);
        }
    };

    const toggleScreenShare = () => {
        if (isSharingScreen) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };

    useEffect(() => {
        if (!isSharingScreen) return;
        if (!localScreenVideoRef.current) return;
        if (!screenStreamRef.current) return;
    
        localScreenVideoRef.current.srcObject = screenStreamRef.current;
    
        localScreenVideoRef.current.play().catch(console.error);
    }, [isSharingScreen]);

    // Make sure the OS-level "sharing your screen" indicator goes away
    // if the component unmounts while a share is active.
    useEffect(() => {
        return () => {
            screenStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const findReusableScreenSender = () => {
        return peerConnection.getSenders().find(
            sender =>
                sender.track === null &&
                sender.transport != null
        );
    };

    return { isSharingScreen, localScreenVideoRef, toggleScreenShare };
}