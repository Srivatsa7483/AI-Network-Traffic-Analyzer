import { useEffect, useState } from "react";
import { FaDatabase, FaSync, FaCircle, FaTrashAlt, FaPlay, FaPause, FaUndo, FaTimes, FaSlidersH, FaServer, FaFileAlt } from "react-icons/fa";
import API from "../services/api";
import PacketDetailsDrawer from "../components/PacketDetailsDrawer";

function Sessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Replay state
    const [isReplaying, setIsReplaying] = useState(false);
    const [replaySessionId, setReplaySessionId] = useState(null);
    const [replayPackets, setReplayPackets] = useState([]);
    const [displayedPackets, setDisplayedPackets] = useState([]);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replaySpeed, setReplaySpeed] = useState("2"); // default 2x speed multiplier
    const [isReplayPaused, setIsReplayPaused] = useState(false);
    const [selectedPacketId, setSelectedPacketId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [replayStats, setReplayStats] = useState({
        totalPackets: 0,
        totalBytes: 0,
        protocols: { TCP: 0, UDP: 0, ICMP: 0, OTHER: 0 }
    });

    const handleDownloadReport = (sessionId) => {
        const token = localStorage.getItem("auth_token");
        window.open(`/api/sessions/${sessionId}/report?token=${token}`, "_blank");
    };

    const loadSessions = async () => {
        try {
            const response = await API.get("/sessions");
            if (response.data) {
                const mapped = response.data.map((sess) => ({
                    id: sess[0],
                    startTime: sess[1],
                    endTime: sess[2] || "-",
                    totalPackets: sess[3] || 0,
                    status: sess[4] || "Unknown"
                }));
                setSessions(mapped);
            }
            setLoading(false);
        } catch (error) {
            console.error("Sessions Fetch Error:", error);
            setLoading(false);
        }
    };

    const handleDeleteSession = async (sessId) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete session #${sessId}? This will remove all associated packets and threat alerts.`);
        if (!confirmDelete) return;

        setActionLoading(true);
        try {
            const res = await API.delete(`/sessions/${sessId}`);
            if (res.data && res.data.status === "success") {
                alert(res.data.message);
                loadSessions();
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete session.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartReplay = async (sessId) => {
        setActionLoading(true);
        try {
            const res = await API.get(`/sessions/${sessId}/packets`);
            if (res.data) {
                setReplayPackets(res.data);
                setDisplayedPackets([]);
                setReplayIndex(0);
                setReplayStats({
                    totalPackets: 0,
                    totalBytes: 0,
                    protocols: { TCP: 0, UDP: 0, ICMP: 0, OTHER: 0 }
                });
                setReplaySessionId(sessId);
                setIsReplaying(true);
                setIsReplayPaused(false);
            }
        } catch (error) {
            alert("Failed to load packets for replay session.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseReplay = () => {
        setIsReplaying(false);
        setReplaySessionId(null);
        setReplayPackets([]);
        setDisplayedPackets([]);
        setReplayIndex(0);
    };

    const handleRestartReplay = () => {
        setDisplayedPackets([]);
        setReplayIndex(0);
        setReplayStats({
            totalPackets: 0,
            totalBytes: 0,
            protocols: { TCP: 0, UDP: 0, ICMP: 0, OTHER: 0 }
        });
        setIsReplayPaused(false);
    };

    // Replay timer loop
    useEffect(() => {
        if (!isReplaying || isReplayPaused || replayIndex >= replayPackets.length) return;

        const currentPkt = replayPackets[replayIndex];
        const nextPkt = replayPackets[replayIndex + 1];

        let delay = 300; // default in ms
        if (nextPkt) {
            const parseTime = (tStr) => {
                if (!tStr) return 0;
                const parts = tStr.split(":");
                if (parts.length < 3) return 0;
                return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
            };
            const diff = parseTime(nextPkt.timestamp) - parseTime(currentPkt.timestamp);
            if (diff > 0) {
                delay = (diff * 1000) / (replaySpeed === "Max" ? 100 : parseFloat(replaySpeed));
                // Clamp delay to keep replay snappy
                delay = Math.min(Math.max(delay, 5), 1000);
            }
        }

        const timer = setTimeout(() => {
            setDisplayedPackets((prev) => [currentPkt, ...prev].slice(0, 100));
            setReplayStats((prev) => {
                const updatedProtos = { ...prev.protocols };
                const proto = currentPkt.protocol;
                if (proto === "TCP" || proto === "UDP" || proto === "ICMP") {
                    updatedProtos[proto] += 1;
                } else {
                    updatedProtos.OTHER += 1;
                }
                return {
                    totalPackets: prev.totalPackets + 1,
                    totalBytes: prev.totalBytes + currentPkt.packet_size,
                    protocols: updatedProtos
                };
            });
            setReplayIndex((prev) => prev + 1);
        }, delay);

        return () => clearTimeout(timer);
    }, [isReplaying, isReplayPaused, replayIndex, replayPackets, replaySpeed]);

    useEffect(() => {
        loadSessions();
        const timer = setInterval(loadSessions, 10000);
        return () => clearInterval(timer);
    }, []);

    // Color rows by protocol in replay view (Wireshark theme)
    const getRowBgClass = (proto, info = "") => {
        const infoLower = (info || "").toLowerCase();
        if (infoLower.includes("dns")) return "bg-[#251b3b]/30 text-purple-200 hover:bg-[#251b3b]/45";
        if (infoLower.includes("http")) return "bg-[#3d1931]/30 text-pink-200 hover:bg-[#3d1931]/45";
        if (infoLower.includes("tls") || infoLower.includes("client hello")) return "bg-[#1a233d]/30 text-indigo-200 hover:bg-[#1a233d]/45";
        if (proto === "TCP") return "bg-[#16233b]/30 text-blue-200 hover:bg-[#16233b]/45";
        if (proto === "UDP") return "bg-[#132d24]/30 text-emerald-200 hover:bg-[#132d24]/45";
        if (proto === "ICMP") return "bg-[#2e2116]/30 text-amber-200 hover:bg-[#2e2116]/45";
        return "bg-[#161f30]/20 text-slate-300 hover:bg-[#161f30]/40";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]/60">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Database Session Logs</h1>
                    <p className="text-xs text-slate-400">Browse historical capturing runs, active packet counts, and session markers.</p>
                </div>

                <button 
                    onClick={loadSessions}
                    className="flex items-center gap-2 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-xs px-3.5 py-2 rounded-lg transition font-semibold"
                >
                    <FaSync className={`${loading ? "animate-spin" : ""}`} />
                    <span>REFRESH</span>
                </button>
            </div>

            {/* Session Registry Table */}
            <div className="bg-[#111726] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
                <div className="p-5 border-b border-[#1e293b] bg-[#0e1320] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <FaDatabase />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Session Registry</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Neon PostgreSQL</p>
                    </div>
                    {sessions.some(s => s.status === "Running") && (
                        <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-3 py-1.5 rounded-lg">
                            <FaCircle className="text-[6px] animate-pulse" />
                            <span>Live capture in progress — packet count updates every 5s</span>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-[#0e1320] text-slate-400 font-semibold border-b border-[#1e293b]">
                                <th className="py-3 px-5">Session ID</th>
                                <th className="py-3 px-5">Start Time</th>
                                <th className="py-3 px-5">End Time</th>
                                <th className="py-3 px-5 text-right font-mono">Total Packets</th>
                                <th className="py-3 px-5 text-center">Status</th>
                                <th className="py-3 px-5 text-center w-48">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                                        No database sessions discovered.
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-[#161f30]/40 transition duration-150">
                                        <td className="py-3.5 px-5 font-bold text-white font-mono">
                                            #{sess.id}
                                        </td>
                                        <td className="py-3.5 px-5 text-slate-300 font-mono">
                                            {sess.startTime}
                                        </td>
                                        <td className="py-3.5 px-5 text-slate-400 font-mono">
                                            {sess.endTime}
                                        </td>
                                        <td className="py-3.5 px-5 text-right text-blue-400 font-mono font-semibold">
                                            {sess.totalPackets.toLocaleString()}
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                sess.status === "Running"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                            }`}>
                                                <FaCircle className={`text-[6px] ${
                                                    sess.status === "Running" ? "animate-pulse" : ""
                                                }`} />
                                                {sess.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    disabled={actionLoading || sess.totalPackets === 0}
                                                    onClick={() => handleStartReplay(sess.id)}
                                                    className="bg-blue-500/10 hover:bg-blue-600 disabled:opacity-20 text-blue-400 hover:text-white border border-blue-500/20 px-2.5 py-1 rounded transition text-[10px] font-bold flex items-center gap-1"
                                                    title="Replay captured frames visually"
                                                >
                                                    <FaPlay className="text-[8px]" />
                                                    <span>REPLAY</span>
                                                </button>
                                                <button
                                                    disabled={actionLoading || sess.totalPackets === 0}
                                                    onClick={() => handleDownloadReport(sess.id)}
                                                    className="bg-emerald-500/10 hover:bg-emerald-600 disabled:opacity-20 text-emerald-400 hover:text-white border border-emerald-500/20 px-2.5 py-1 rounded transition text-[10px] font-bold flex items-center gap-1"
                                                    title="Export dynamic session report"
                                                >
                                                    <FaFileAlt className="text-[8px]" />
                                                    <span>REPORT</span>
                                                </button>
                                                <button
                                                    disabled={actionLoading || sess.status === "Running"}
                                                    onClick={() => handleDeleteSession(sess.id)}
                                                    className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white disabled:opacity-20 border border-rose-500/20 p-2 rounded transition"
                                                    title={sess.status === "Running" ? "Active captures cannot be deleted." : "Purge session record"}
                                                >
                                                    <FaTrashAlt className="text-xs" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Visual Replay Modal */}
            {isReplaying && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b border-[#1e293b] bg-[#0e1320] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 animate-pulse">
                                    <FaServer />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Visual Replay Terminal</h2>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">
                                        Replaying Captures from Session #{replaySessionId}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseReplay}
                                className="h-8 w-8 rounded-lg hover:bg-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Replay Controls & Stats */}
                        <div className="p-4 border-b border-[#1e293b] bg-[#0e1320]/60 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Playback keys */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsReplayPaused(p => !p)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                                            isReplayPaused 
                                                ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                : "bg-[#161f30] hover:bg-[#1d2a42] text-slate-200 border border-[#1e293b]"
                                        }`}
                                    >
                                        {isReplayPaused ? (
                                            <>
                                                <FaPlay className="text-[10px]" />
                                                <span>RESUME</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPause className="text-[10px]" />
                                                <span>PAUSE</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleRestartReplay}
                                        className="flex items-center gap-1.5 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-300 px-3.5 py-2 rounded-lg text-xs font-bold transition"
                                    >
                                        <FaUndo className="text-[9px]" />
                                        <span>RESTART</span>
                                    </button>

                                    {/* Speed Controller */}
                                    <div className="flex items-center gap-1 bg-[#161f30] border border-[#1e293b] rounded-lg p-1 text-[11px] font-bold text-slate-400">
                                        <span className="px-2 text-slate-500 text-[10px]">SPEED:</span>
                                        {["1", "2", "5", "10", "Max"].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setReplaySpeed(s)}
                                                className={`px-2.5 py-1 rounded transition ${
                                                    replaySpeed === s 
                                                        ? "bg-blue-600 text-white" 
                                                        : "hover:bg-[#1d2a42] hover:text-slate-200"
                                                }`}
                                            >
                                                {s}x
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Replay stats summary */}
                                <div className="grid grid-cols-4 gap-2 bg-[#161f30] border border-[#1e293b] p-2.5 rounded-xl font-mono text-[10px]">
                                    <div className="text-center border-r border-[#1e293b]">
                                        <div className="text-slate-500 font-bold uppercase tracking-wider">Frames</div>
                                        <div className="text-blue-400 font-bold text-xs mt-0.5">{replayStats.totalPackets}</div>
                                    </div>
                                    <div className="text-center border-r border-[#1e293b]">
                                        <div className="text-slate-500 font-bold uppercase tracking-wider">TCP</div>
                                        <div className="text-indigo-400 font-bold text-xs mt-0.5">{replayStats.protocols.TCP}</div>
                                    </div>
                                    <div className="text-center border-r border-[#1e293b]">
                                        <div className="text-slate-500 font-bold uppercase tracking-wider">UDP</div>
                                        <div className="text-emerald-400 font-bold text-xs mt-0.5">{replayStats.protocols.UDP}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-slate-500 font-bold uppercase tracking-wider">ICMP/Oth</div>
                                        <div className="text-amber-400 font-bold text-xs mt-0.5">
                                            {replayStats.protocols.ICMP + replayStats.protocols.OTHER}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-500 font-semibold font-mono">
                                    <span>PROGRESS: {replayIndex} / {replayPackets.length} PACKETS</span>
                                    <span>{Math.round((replayIndex / replayPackets.length) * 100)}% COMPLETE</span>
                                </div>
                                <div className="w-full bg-[#161f30] rounded-full h-2 overflow-hidden border border-[#1e293b]">
                                    <div 
                                        className="bg-blue-500 h-full transition-all duration-300"
                                        style={{ width: `${(replayIndex / replayPackets.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Visual Replay Frame stream */}
                        <div className="flex-1 overflow-auto bg-[#070a10] border-b border-[#1e293b]">
                            <table className="w-full text-left border-collapse text-[11px] font-mono whitespace-nowrap">
                                <thead className="sticky top-0 bg-[#0e1320] border-b border-[#1e293b] text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none z-10">
                                    <tr>
                                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                                        <th className="py-2.5 px-4 w-20">Time</th>
                                        <th className="py-2.5 px-4 w-36">Source IP</th>
                                        <th className="py-2.5 px-4 w-36">Destination IP</th>
                                        <th className="py-2.5 px-4 w-16 text-center">Protocol</th>
                                        <th className="py-2.5 px-4 w-16 text-right">Length</th>
                                        <th className="py-2.5 px-4">Info Summary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedPackets.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-20 text-center text-slate-600 font-bold animate-pulse text-xs">
                                                {isReplayPaused ? "Replay Paused. Click RESUME to begin." : "Visual Replay Engine Buffer Ready..."}
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedPackets.map((pkt, idx) => (
                                            <tr 
                                                key={`${pkt.id}-${idx}`}
                                                onClick={() => {
                                                    setSelectedPacketId(pkt.id);
                                                    setIsDrawerOpen(true);
                                                }}
                                                className={`cursor-pointer border-b border-[#1e293b]/10 transition-colors duration-75 ${getRowBgClass(pkt.protocol, pkt.info)}`}
                                            >
                                                <td className="py-2 px-4 text-center text-slate-500 font-bold">
                                                    {pkt.id}
                                                </td>
                                                <td className="py-2 px-4 text-slate-400">
                                                    {pkt.timestamp}
                                                </td>
                                                <td className="py-2 px-4 font-semibold text-slate-100 truncate max-w-[130px]">
                                                    {pkt.source_ip}
                                                </td>
                                                <td className="py-2 px-4 font-semibold text-slate-100 truncate max-w-[130px]">
                                                    {pkt.destination_ip}
                                                </td>
                                                <td className="py-2 px-4 text-center">
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border border-white/5 bg-white/5">
                                                        {pkt.protocol}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-4 text-right text-blue-400 font-bold">
                                                    {pkt.packet_size}
                                                </td>
                                                <td className="py-2 px-4 text-slate-300 truncate max-w-lg" title={pkt.info}>
                                                    {pkt.info || "-"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Structured Wireshark Details Drawer Overlay */}
            <PacketDetailsDrawer
                packetId={selectedPacketId}
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedPacketId(null);
                }}
            />
        </div>
    );
}

export default Sessions;
