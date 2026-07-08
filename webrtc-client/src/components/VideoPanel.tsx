import type { RefObject } from "react";

interface VideoPanelProps {
    title: string;
    videoRef: RefObject<HTMLVideoElement>;
    muted?: boolean;
}

export function VideoPanel({ title, videoRef, muted = false }: VideoPanelProps) {
    return (
        <div className="flex flex-col">
            <h2 className="font-semibold mb-2 text-slate-700 text-sm md:text-base">
                {title}
            </h2>

            <video
                ref={videoRef}
                autoPlay
                muted={muted}
                playsInline
                className="w-full h-auto aspect-video rounded-xl bg-black shadow-md object-cover"
            />
        </div>
    );
}