import { useState, useEffect } from "react";
import { FaSlidersH, FaServer, FaDatabase, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import API from "../services/api";

function Settings() {
    const [connStatus, setConnStatus] = useState("TESTING");
    const [connDelay, setConnDelay] = useState(0);
    const [dbStats, setDbStats] = useState({ total_packets: 0, total_alerts: 0 });
    const [currentTheme, setCurrentTheme] = useState(
        localStorage.getItem("active_theme") || "cyberpunk"
    );

    const changeTheme = (themeName) => {
        document.documentElement.classList.remove("theme-cyberpunk", "theme-matrix", "theme-threat", "theme-obsidian");
        document.documentElement.classList.add(`theme-${themeName}`);
        localStorage.setItem("active_theme", themeName);
        setCurrentTheme(themeName);
        // Trigger a custom event to notify other components (e.g. Navbar)
        window.dispatchEvent(new Event("theme-changed"));
    };

    const testConnection = async () => {
        setConnStatus("TESTING");
        const start = performance.now();
        try {
            const res = await API.get("/health");
            const duration = Math.round(performance.now() - start);
            if (res.data && res.data.status === "healthy") {
                setConnStatus("ONLINE");
                setConnDelay(duration);
            } else {
                setConnStatus("DEGRADED");
            }
        } catch (error) {
            setConnStatus("OFFLINE");
        }
    };

    const fetchDbStats = async () => {
        try {
            const metricsRes = await API.get("/metrics");
            const securityRes = await API.get("/security");
            setDbStats({
                total_packets: metricsRes.data?.total_packets || 0,
                total_alerts: securityRes.data?.total_alerts || 0
            });
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        testConnection();
        fetchDbStats();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-[#1e293b]/60">
                <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
                <p className="text-xs text-slate-400">Configure parameters for network capture, threat detection, and database status.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Threat Detection Config */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#1e293b]/40 pb-3">
                        <FaSlidersH className="text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Threat Thresholds</h2>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">Port Scan Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                10 ports / 10s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">SYN Flood Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                50 packets / 10s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">DNS Query Flood Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                100 queries / 10s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">ICMP Ping Flood Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                100 packets / 10s
                            </span>
                        </div>
                    </div>
                </div>

                {/* API Diagnostics */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between mb-2 border-b border-[#1e293b]/40 pb-3">
                        <div className="flex items-center gap-2.5">
                            <FaServer className="text-indigo-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Engine Connection</h2>
                        </div>
                        <button
                            onClick={testConnection}
                            className="bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-[10px] px-2.5 py-1 rounded transition font-bold"
                        >
                            RETEST
                        </button>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400 font-medium">API Server Endpoint</span>
                            <span className="text-slate-300 font-mono">http://127.0.0.1:5000</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400 font-medium">Latency Ping</span>
                            <span className="text-slate-300 font-mono">{connDelay} ms</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">Health Status</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                connStatus === "ONLINE"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : connStatus === "TESTING"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                                {connStatus === "ONLINE" ? <FaCheckCircle /> : <FaExclamationCircle />}
                                {connStatus}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Database Info */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#1e293b]/40 pb-3">
                        <FaDatabase className="text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Database Registry Status</h2>
                    </div>

                    <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider block">Database Name</span>
                            <span className="text-white font-mono text-xs">network_analyzer.db</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider block">Captured Packets</span>
                            <span className="text-blue-400 font-mono text-xs font-semibold">{dbStats.total_packets.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider block">Threat Alerts</span>
                            <span className="text-rose-400 font-mono text-xs font-semibold">{dbStats.total_alerts.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Theme Selector */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#1e293b]/40 pb-3">
                        <span className="text-indigo-400 font-bold">🎨</span>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Visual Interface Themes</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <button
                            onClick={() => changeTheme("cyberpunk")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "cyberpunk"
                                    ? "bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/10"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Cyberpunk Blue</span>
                            <span className="text-[10px] text-slate-500">Cobalt / Indigo Accent</span>
                        </button>

                        <button
                            onClick={() => changeTheme("matrix")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "matrix"
                                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Matrix Green</span>
                            <span className="text-[10px] text-slate-500">Code Rain / Terminal Green</span>
                        </button>

                        <button
                            onClick={() => changeTheme("threat")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "threat"
                                    ? "bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-500/10"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Threat Crimson</span>
                            <span className="text-[10px] text-slate-500">Warning Orange / Red Alert</span>
                        </button>

                        <button
                            onClick={() => changeTheme("obsidian")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "obsidian"
                                    ? "bg-white/5 border-white/30 shadow-md shadow-white/5"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Stealth Obsidian</span>
                            <span className="text-[10px] text-slate-500">Monochromatic Gray / White</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
