import RecentPackets from "../components/RecentPackets";

function Packets() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-[#1e293b]/60">
                <h1 className="text-2xl font-bold tracking-tight text-white">Packet Explorer</h1>
                <p className="text-xs text-slate-400">Search and filter indexed database packet records.</p>
            </div>

            {/* Packet stream table */}
            <RecentPackets />
        </div>
    );
}

export default Packets;
