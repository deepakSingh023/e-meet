import { useParams } from "react-router-dom";
import { socket } from "../service/websockets";
import { useWebRTC } from "../hooks/useWebrtc";
import { useSocketHandlers } from "../hooks/useSocketHandlers";
import { useMediaControls } from "../hooks/useMediaController";
import { useScreenShare } from "../hooks/useScreenShare";
import { VideoPanel } from "../components/VideoPanel";
import { ControlBar } from "../components/ControlBar";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarUrl } from "../api/profileApi";


export function Room(): React.JSX.Element {

    const { roomId } = useParams();
    const { user, isAuthenticated } = useAuth();

    const {
        peerConnection,
        peerDataType,
        localVideoRef,
        remoteVideoRef,
        remoteScreenVideoRef,
        isMediaReady,
        iceCandidatesQueue,
        isRemoteSharingScreen,
        clearRemoteScreenShare,
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

    const { remotePeer, remoteCameraOff } = useSocketHandlers({
        roomId,
        peerConnection,
        peerDataType,
        isMediaReady,
        iceCandidatesQueue,
        remoteVideoRef,
        onScreenShareStop: clearRemoteScreenShare
    });

    const { mute, video, toggleVideo, toggleAudio } = useMediaControls(localVideoRef, roomId);
    const {isSharingScreen,toggleScreenShare,localScreenVideoRef,} = useScreenShare(peerConnection, roomId);

    const localUsername = isAuthenticated && user ? user.username : "You";
    const localAvatarUrl = isAuthenticated && user ? resolveAvatarUrl(user.avatar) : null;

    const isScreenSharePanelVisible = isSharingScreen || isRemoteSharingScreen;
    const screenShareTitle = isSharingScreen
        ? "Your Screen"
        : `${remotePeer?.username ?? "Peer"}'s Screen`;

    return (
        <div className="min-h-screen p-4 md:p-6 bg-slate-100">

            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">
                Room {roomId}
            </h1>

            <ControlBar
                video={video}
                mute={mute}
                isSharingScreen={isSharingScreen}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                onToggleScreenShare={toggleScreenShare}
                onEndCall={endCall}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
                <VideoPanel
                    title="Local Video"
                    videoRef={localVideoRef}
                    muted
                    username={localUsername}
                    avatarUrl={localAvatarUrl}
                    isCameraOff={!video}
                />
                <VideoPanel
                    title="Remote Video"
                    videoRef={remoteVideoRef}
                    username={remotePeer?.username}
                    avatarUrl={remotePeer?.avatarUrl}
                    isCameraOff={remoteCameraOff}
                />

                {isScreenSharePanelVisible && (
                    <div className="md:col-span-2">
                        <VideoPanel
                            title={screenShareTitle}
                            videoRef={
                                isSharingScreen
                                    ? localScreenVideoRef
                                    : remoteScreenVideoRef
                            }
                            muted={isSharingScreen}
                            variant="screen"
                        />
                    </div>
                )}
            </div>

        </div>
    );
}