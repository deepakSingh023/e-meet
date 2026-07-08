import type { Metrics } from "../service/metrics";

interface MetricsBoardProps {
    metrics: Metrics;
}

export function MetricsBoard({ metrics }: MetricsBoardProps) {
    return (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl shadow-md p-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-lg md:text-xl flex items-center gap-2">
                    📊 Network Telemetry Metrics Board
                </h3>
                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-md tracking-wider">
                    ROLE: {metrics.type}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Latency (RTT)</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{metrics.rtt.toFixed(1)} ms</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Jitter</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{metrics.jitter.toFixed(4)} s</p>
                </div>

                {/* Color Warning Guard: turns red if packet loss crosses zero */}
                <div className={`p-3 rounded-lg border transition-colors ${
                    metrics.packetsLost > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-100 text-slate-800"
                }`}>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Packets Lost</p>
                    <p className="text-xl md:text-2xl font-bold mt-1">{metrics.packetsLost}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Frame Rate</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{metrics.fps} FPS</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Frames Dropped</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{metrics.framesDropped}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Bytes Sent / Recv</p>
                    <p className="text-sm font-semibold text-slate-700 mt-2 truncate">
                        {(metrics.bytesSent / 1024).toFixed(0)}K / {(metrics.bytesReceived / 1024).toFixed(0)}K
                    </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Estimated Outbound Bandwidth</p>
                    <p className="text-lg md:text-xl font-bold text-blue-600 mt-1">
                        {(metrics.availableOutgoingBitrate / 1000).toFixed(1)} Kbps
                    </p>
                </div>

            </div>
        </div>
    );
}