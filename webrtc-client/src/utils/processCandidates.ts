import type { MutableRefObject } from "react";

/**
 * Drains a queue of ICE candidates that arrived before the remote
 * description was set, adding each one to the peer connection in order.
 */
export async function processQueuedCandidates(
    peerConnection: RTCPeerConnection,
    queueRef: MutableRefObject<RTCIceCandidateInit[]>
): Promise<void> {
    while (queueRef.current.length > 0) {
        const candidate = queueRef.current.shift();
        if (candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log("Successfully processed a queued ICE Candidate!");
            } catch (e) {
                console.error("Failed to add queued candidate:", e);
            }
        }
    }
}