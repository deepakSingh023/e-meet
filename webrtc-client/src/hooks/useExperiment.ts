import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { buildMetrics, sendMetrics } from "../service/metrics";
import type { Metrics } from "../service/metrics";
import type { PeerDataType } from "./useWebrtc";

interface UseExperimentParams {
    isPeerConnected: boolean;
    isMediaReady: MutableRefObject<boolean>;
    peerDataType: MutableRefObject<PeerDataType>;
    peerConnection: RTCPeerConnection;
    apiUrl: string;
    endCall: () => void;
}

/**
 * Once both peers are connected: polls WebRTC stats every 10s and posts
 * them to the backend, and auto-ends the call after 5 minutes.
 */
export function useExperiment({
    isPeerConnected,
    isMediaReady,
    peerDataType,
    peerConnection,
    apiUrl,
    endCall
}: UseExperimentParams) {
    const [liveMetrics, setLiveMetrics] = useState<Metrics | null>(null);

    const collectAndSendMetrics = async () => {
        if (!peerDataType.current || !peerConnection) return;

        try {
            const metrics = await buildMetrics(peerConnection, peerDataType.current);
            setLiveMetrics(metrics);
            await sendMetrics(apiUrl, metrics);
            console.log(`>>> Telemetry logged for: ${peerDataType.current}`);
        } catch (error) {
            console.error("Failed to compile WebRTC stats metrics:", error);
        }
    };

    useEffect(() => {

        if (!isPeerConnected) {
            console.log("Waiting for peer connection before launching experiment clocks...");
            return;
        }

        console.log("=== BOTH USERS CONNECTED: Starting 5-Minute Experiment Clocks ===");

        // 1. The 10-Second Metrics Interval Loop
        const telemetryInterval = setInterval(() => {
            if (isMediaReady.current && peerDataType.current) {
                collectAndSendMetrics();
            }
        }, 10000);

        // 2. The 5-Minute (300,000ms) Auto-Kill Timer
        const callDurationTimeout = setTimeout(() => {
            if (isMediaReady.current) {
                console.log("=== 5-Minute Mark Reached. Auto-Terminating Experiment ===");
                alert("Experiment window complete. Terminating connection.");
                endCall();
            }
        }, 300000);

        // 3. Clean up timers if a user exits early
        return () => {
            clearInterval(telemetryInterval);
            clearTimeout(callDurationTimeout);
            console.log("Telemetry and timeout monitors cleared out.");
        };
    }, [isPeerConnected]);

    return { liveMetrics };
}