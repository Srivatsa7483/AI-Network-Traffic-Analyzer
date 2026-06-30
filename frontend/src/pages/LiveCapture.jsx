import CaptureControls from "../components/CaptureControls";
import RecentPackets from "../components/RecentPackets";

function LiveCapture() {
    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="pb-4 border-b border-[#1e293b]/60 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span>Live Socket Capture</span>
                    </h1>
                    <p className="text-xs text-slate-400">Sniff, parse, and analyze raw network frames in real-time.</p>
                </div>
            </div>

            {/* Top Toolbar Controls */}
            <CaptureControls />

            {/* Wireshark Packet Table Feed */}
            <div className="flex-1 min-h-[450px]">
                <RecentPackets />
            </div>
        </div>
    );
}

export default LiveCapture;
