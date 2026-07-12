import { useParams } from "react-router-dom";
import { socket } from "../service/websockets";
import { useWebRTC } from "../hooks/useWebrtc";
import { useSocketHandlers } from "../hooks/useSocketHandlers";
import { useMediaControls } from "../hooks/useMediaController";
import { VideoPanel } from "../components/VideoPanel";
import { ControlBar } from "../components/ControlBar";


export function Room(): React.JSX.Element {

    const { roomId } = useParams();

    const {
        peerConnection,
        peerDataType,
        localVideoRef,
        remoteVideoRef,
        isMediaReady,
        iceCandidatesQueue,
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

        </div>
    );
}