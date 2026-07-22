interface ControlBarProps {
    video: boolean;
    mute: boolean;
    isSharingScreen: boolean;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
    onToggleScreenShare: () => void;
    onEndCall: () => void;
}

export function ControlBar({
    video,
    mute,
    isSharingScreen,
    onToggleVideo,
    onToggleAudio,
    onToggleScreenShare,
    onEndCall
}: ControlBarProps) {
    return (
        <div className="flex flex-wrap gap-3 mb-6 max-w-6xl mx-auto">
            <button
                onClick={onToggleVideo}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md active:scale-95 transition-all duration-150 ${
                    video
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-red-600 hover:bg-red-700"
                }`}
            >
                {video ? "Turn Camera Off" : "Turn Camera On"}
            </button>
            <button
                onClick={onToggleAudio}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md active:scale-95 transition-all duration-150 ${
                    mute
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                }`}
            >
                {mute ? "Unmute Mic" : "Mute Mic"}
            </button>

            <button
                onClick={onToggleScreenShare}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md active:scale-95 transition-all duration-150 ${
                    isSharingScreen
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-slate-600 hover:bg-slate-700"
                }`}
            >
                {isSharingScreen ? "Stop Sharing" : "🖥️ Share Screen"}
            </button>

            {/* High-Visibility, Responsive End Call Button */}
            <button
                onClick={onEndCall}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md active:scale-95 hover:shadow-lg transition-all duration-150 flex items-center gap-2 border border-rose-500/20"
            >
                📞 End Call
            </button>
        </div>
    );
}