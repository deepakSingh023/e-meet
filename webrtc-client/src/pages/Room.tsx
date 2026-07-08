import { useParams } from "react-router-dom";
import { socket } from "../service/websockets";
import { useWebRTC } from "../hooks/useWebrtc";
import { useSocketHandlers } from "../hooks/useSocketHandlers";
import { useMediaControls } from "../hooks/useMediaController";
import { useExperiment } from "../hooks/useExperiment";
import { VideoPanel } from "../components/VideoPanel";
import { ControlBar } from "../components/ControlBar";
import { MetricsBoard } from "../components/MetricBoard";

export function Room(): React.JSX.Element {

    const API_URL = import.meta.env.VITE_API_URL;
    const { roomId } = useParams();

    const {
        peerConnection,
        peerDataType,
        localVideoRef,
        remoteVideoRef,
        isMediaReady,
        iceCandidatesQueue,
        isPeerConnected
    } = useWebRTC(roomId);

    const endCall = () => {
        socket.send(
            JSON.stringify({
                type: "END_CALL",
                roomId: roomId,
                payload: null
            })
        );

        peerConnection.close();

        window.location.href = "/";
    };

    useSocketHandlers({
        roomId,
        peerConnection,
        peerDataType,
        isMediaReady,
        iceCandidatesQueue,
        remoteVideoRef
    });

    const { mute, video, toggleVideo, toggleAudio } = useMediaControls(localVideoRef);

    const { liveMetrics } = useExperiment({
        isPeerConnected,
        isMediaReady,
        peerDataType,
        peerConnection,
        apiUrl: API_URL,
        endCall
    });

    return (
        <div className="min-h-screen p-4 md:p-6 bg-slate-100">

            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">
                Room {roomId}
            </h1>

            <ControlBar
                video={video}
                mute={mute}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                onEndCall={endCall}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
                <VideoPanel title="Local Video" videoRef={localVideoRef} muted />
                <VideoPanel title="Remote Video" videoRef={remoteVideoRef} />
            </div>

            {liveMetrics && <MetricsBoard metrics={liveMetrics} />}

        </div>
    );
}