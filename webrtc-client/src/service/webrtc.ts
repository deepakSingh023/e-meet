
export function createPeerConnection(): RTCPeerConnection {
    return new RTCPeerConnection({
        iceServers: [
            {
                urls:
                "stun:stun.l.google.com:19302"
            }
            ,{
                urls: `turn:${window.location.hostname}:3478?transport=udp`,
                username: "researchuser",
                credential: "palak123"

            }
        ]
    });
}