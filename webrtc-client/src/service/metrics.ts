export interface Metrics {
    elapsedTime: number;
    rtt: number;
    jitter: number;
    packetsLost: number;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
    availableOutgoingBitrate: number;
    availableIncomingBitrate: number;
    fps: number;
    framesDropped: number;
    type: "LOCAL" | "REMOTE";
}

/**
 * Walks the RTCStatsReport and assembles it into the flat shape
 * expected by the Java Record on the backend.
 */
export async function buildMetrics(
    peerConnection: RTCPeerConnection,
    peerDataType: "LOCAL" | "REMOTE"
): Promise<Metrics> {
    const stats = await peerConnection.getStats();

    const metrics: Metrics = {
        elapsedTime: 0, // Calculated autonomously by the Java server
        rtt: 0,
        jitter: 0,
        packetsLost: 0,
        packetsSent: 0,
        packetsReceived: 0,
        bytesSent: 0,
        bytesReceived: 0,
        availableOutgoingBitrate: 0,
        availableIncomingBitrate: 0,
        fps: 30.0, // Default baseline if media layer hasn't initialized
        framesDropped: 0,
        type: peerDataType
    };

    stats.forEach((report: any) => {
        // LATENCY LAYER (Safe for both PC and Phone)
        if (report.type === "candidate-pair" && report.currentRoundTripTime !== undefined) {
            metrics.rtt = report.currentRoundTripTime * 1000; // seconds -> ms
        }

        // BANDWIDTH ESTIMATION LAYER (Spec-compliant for Desktop Chrome/Brave)
        if (report.type === "transport") {
            metrics.availableOutgoingBitrate = report.availableOutgoingBitrate || 0;
            metrics.availableIncomingBitrate = report.availableIncomingBitrate || 0;
        }

        // JITTER & LOSS (Receiver-side metrics)
        if (report.type === "remote-inbound-rtp") {
            if (!metrics.rtt) metrics.rtt = (report.roundTripTime || 0) * 1000;
            metrics.jitter = report.jitter || 0;
            metrics.packetsLost = report.packetsLost || 0;
        }

        // OUTBOUND THROUGHPUT (Sender-side metrics)
        if (report.type === "outbound-rtp") {
            metrics.packetsSent += report.packetsSent || 0;
            metrics.bytesSent += report.bytesSent || 0;
            if (report.framesPerSecond) metrics.fps = report.framesPerSecond;
        }

        // INBOUND QUALITY LAYER
        if (report.type === "inbound-rtp") {
            metrics.packetsReceived += report.packetsReceived || 0;
            metrics.bytesReceived += report.bytesReceived || 0;
            metrics.framesDropped += report.framesDropped || 0;
        }
    });

    return metrics;
}

/** POSTs the metrics payload to the Spring Boot experiment controller. */
export async function sendMetrics(apiUrl: string, metrics: Metrics): Promise<void> {
    await fetch(`${apiUrl}/api/experiment/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics)
    });
}