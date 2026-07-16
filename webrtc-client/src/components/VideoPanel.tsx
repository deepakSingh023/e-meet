import { useState, type RefObject } from "react";

interface VideoPanelProps {
    title: string;
    videoRef: RefObject<HTMLVideoElement>;
    muted?: boolean;
    username?: string;
    avatarUrl?: string | null;
    /** Only meaningful for the local panel — true when the user has turned their camera off */
    isCameraOff?: boolean;
}

export function VideoPanel({
    title,
    videoRef,
    muted = false,
    username,
    avatarUrl,
    isCameraOff = false,
}: VideoPanelProps) {
    const initials = username ? username.charAt(0).toUpperCase() : "?";

    return (
        <div className="flex flex-col">
            <h2 className="font-semibold mb-2 text-slate-700 text-sm md:text-base">
                {title}
            </h2>

            <div className="relative w-full aspect-video rounded-xl bg-black shadow-md overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    muted={muted}
                    playsInline
                    className={`w-full h-full object-cover ${isCameraOff ? "invisible" : "visible"}`}
                />

                {/* Camera-off placeholder — own pic + name, replaces the (blank) video feed */}
                {isCameraOff && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-800">
                        <Avatar avatarUrl={avatarUrl} initials={initials} size={72} />
                        {username && (
                            <span className="text-white text-sm font-medium">{username}</span>
                        )}
                    </div>
                )}

                {/* Waiting-for-peer placeholder — remote panel before we've resolved who joined */}
                {!isCameraOff && !username && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">Waiting for peer…</span>
                    </div>
                )}

                {/* Name badge — always shown once we know who this feed belongs to */}
                {username && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full pl-1 pr-3 py-1">
                        <Avatar avatarUrl={avatarUrl} initials={initials} size={22} />
                        <span className="text-white text-xs font-medium truncate max-w-[140px]">
                            {username}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function Avatar({
    avatarUrl,
    initials,
    size,
}: {
    avatarUrl?: string | null;
    initials: string;
    size: number;
}) {
    const [failed, setFailed] = useState(false);
    const showImage = Boolean(avatarUrl) && !failed;

    return (
        <div
            className="rounded-full overflow-hidden bg-slate-600 flex items-center justify-center text-white font-semibold shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
            {showImage ? (
                <img
                    src={avatarUrl as string}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                initials
            )}
        </div>
    );
}