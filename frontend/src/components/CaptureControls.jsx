import { useState, useEffect } from "react";
import { FaPlay, FaPause, FaStop, FaTrashAlt, FaDownload, FaFileCsv, FaCircle, FaEthernet } from "react-icons/fa";
import API from "../services/api";

function CaptureControls({ onClearSuccess = () => {} }) {
    const [status, setStatus] = useState({ running: true, paused: false });
    const [selectedInterface, setSelectedInterface] = useState("default");
    const [actionLoading, setActionLoading] = useState(false);

    const API_BASE = "http://127.0.0.1:5000";

    const fetchStatus = async () => {
        try {
            const res = await API.get("/capture/status");
            if (res.data) {
                setStatus({
                    running: res.data.running,
                    paused: res.data.paused
                });
            }
        } catch (error) {
            console.error("Status Poll Error:", error);
        }
    };

    useEffect(() => {
        fetchStatus();
        const timer = setInterval(fetchStatus, 3000);
        return () => clearInterval(timer);
    }, []);

    const triggerAction = async (actionPath) => {
        setActionLoading(true);
        try {
            await API.post(actionPath);
            await fetchStatus();
            if (actionPath === "/capture/clear") {
                onClearSuccess();
            }
        } catch (error) {
            console.error(`Action ${actionPath} Error:`, error);
        } finally {
            setActionLoading(false);
        }
    };

    // Determine status badge classes
    const getStatusState = () => {
        if (!status.running) return { text: "STOPPED", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
        if (status.paused) return { text: "PAUSED", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
        return { text: "CAPTURING LIVE", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 blink-status" };
    };

    const statusBadge = getStatusState();

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-4 shadow-lg flex flex-col xl:flex-row items-center justify-between gap-4">
            
            {/* Status & Interface */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-bold tracking-wider ${statusBadge.color}`}>
                    <FaCircle className={`text-[8px] ${statusBadge.text === "CAPTURING LIVE" ? "animate-pulse" : ""}`} />
                    <span>{statusBadge.text}</span>
                </div>

                <div className="relative flex items-center bg-[#161f30] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-300">
                    <FaEthernet className="text-slate-500 mr-2" />
                    <select
                        value={selectedInterface}
                        onChange={(e) => setSelectedInterface(e.target.value)}
                        className="bg-transparent outline-none border-none text-slate-300 font-semibold cursor-pointer"
                    >
                        <option value="default">Default Interface</option>
                        <option value="eth0">eth0 (Ethernet)</option>
                        <option value="wlan0">wlan0 (Wireless)</option>
                        <option value="lo">lo (Loopback)</option>
                    </select>
                </div>
            </div>

            {/* Core Controls */}
            <div className="flex items-center gap-2 bg-[#0e1320] border border-[#1e293b]/70 p-1.5 rounded-lg w-full sm:w-auto justify-center">
                {/* Start Button */}
                <button
                    onClick={() => triggerAction("/capture/start")}
                    disabled={actionLoading || (status.running && !status.paused)}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600/10 hover:bg-emerald-600 disabled:opacity-20 text-emerald-400 hover:text-white px-3.5 py-2 rounded text-xs font-bold transition border border-emerald-500/20"
                    title="Start Capture"
                >
                    <FaPlay className="text-[10px]" />
                    <span className="hidden sm:inline">START</span>
                </button>

                {/* Pause Button */}
                <button
                    onClick={() => triggerAction("/capture/pause")}
                    disabled={actionLoading || !status.running || status.paused}
                    className="flex items-center justify-center gap-1.5 bg-amber-600/10 hover:bg-amber-600 disabled:opacity-20 text-amber-400 hover:text-white px-3.5 py-2 rounded text-xs font-bold transition border border-amber-500/20"
                    title="Pause Capture"
                >
                    <FaPause className="text-[10px]" />
                    <span className="hidden sm:inline">PAUSE</span>
                </button>

                {/* Stop Button */}
                <button
                    onClick={() => triggerAction("/capture/stop")}
                    disabled={actionLoading || !status.running}
                    className="flex items-center justify-center gap-1.5 bg-rose-600/10 hover:bg-rose-600 disabled:opacity-20 text-rose-400 hover:text-white px-3.5 py-2 rounded text-xs font-bold transition border border-rose-500/20"
                    title="Stop Capture"
                >
                    <FaStop className="text-[10px]" />
                    <span className="hidden sm:inline">STOP</span>
                </button>

                <div className="w-[1px] h-5 bg-[#1e293b] mx-1"></div>

                {/* Clear Button */}
                <button
                    onClick={() => triggerAction("/capture/clear")}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 bg-slate-600/10 hover:bg-slate-600 text-slate-400 hover:text-white px-3.5 py-2 rounded text-xs font-bold transition border border-slate-500/20"
                    title="Clear Telemetry Feed"
                >
                    <FaTrashAlt className="text-[10px]" />
                    <span className="hidden sm:inline">CLEAR</span>
                </button>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <a
                    href={`${API_BASE}/export/csv`}
                    download
                    className="flex items-center justify-center gap-1.5 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-300 text-xs px-3.5 py-2.5 rounded-lg transition font-semibold"
                >
                    <FaFileCsv className="text-emerald-400 text-sm" />
                    <span>CSV</span>
                </a>

                <a
                    href={`${API_BASE}/export/pcap`}
                    download
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-lg transition font-semibold shadow-lg shadow-blue-500/10"
                >
                    <FaDownload className="text-sm" />
                    <span>PCAP</span>
                </a>
            </div>

        </div>
    );
}

export default CaptureControls;
