import { useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Local mic/camera toggle state. Reads/writes the tracks on the
 * MediaStream already attached to localVideoRef by useWebRTC.
 */
export function useMediaControls(localVideoRef: RefObject<HTMLVideoElement>) {
    const [mute, setMute] = useState(false);
    const [video, setVideo] = useState(true);

    const isVideoEnabled = useRef(true);
    const isAudioEnabled = useRef(true);

    const toggleVideo = () => {
        const stream = localVideoRef.current?.srcObject as MediaStream;
        if (!stream) {
            console.warn("No active camera stream found to toggle.");
            return;
        }

        isVideoEnabled.current = !isVideoEnabled.current;
        setVideo(prev => !prev);
        stream.getVideoTracks().forEach(track => {
            track.enabled = isVideoEnabled.current;
        });
        console.log(`Camera active state: ${isVideoEnabled.current}`);
    };

    const toggleAudio = () => {
        const stream = localVideoRef.current?.srcObject as MediaStream;
        if (!stream) {
            console.warn("No active mic stream found to toggle.");
            return;
        }

        isAudioEnabled.current = !isAudioEnabled.current;
        setMute(prev => !prev);
        stream.getAudioTracks().forEach(track => {
            track.enabled = isAudioEnabled.current;
        });
        console.log(`Mic active state: ${isAudioEnabled.current}`);
    };

    return { mute, video, toggleVideo, toggleAudio };
}