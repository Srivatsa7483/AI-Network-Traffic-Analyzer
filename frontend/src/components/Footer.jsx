import { useState, useEffect, useRef } from "react";
import { FaTerminal, FaClock, FaHdd, FaShieldAlt } from "react-icons/fa";
import API from "../services/api";

const THREAT_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Simulated log lines that scroll in the footer terminal
const LOG_TEMPLATES = [
    (ip) => `[SYN] → ${ip}:80 — handshake initiated`,
    (ip) => `[ARP] reply ${ip} — cache updated`,
    (ip) => `[DNS] query A-record from ${ip}`,
    (ip) => `[TCP] flow established ${ip}:443`,
    (ip) => `[UDP] datagram from ${ip}:53`,
    (ip) => `[ICMP] echo req ${ip} ttl=64`,
    () => `[IDS] baseline re-evaluated`,
    () => `[ML] model inference: normal`,
    () => `[PKT] batch captured 512 frames`,
];

function randomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 99) + 1}.${Math.floor(Math.random() * 254) + 1}`;
}

function Footer() {
    const [stats, setStats] = useState({ session_id: "-", active_alerts: 0, running_time: "00:00:00" });
    const [threatLevel, setThreatLevel] = useState(0);
    const [logs, setLogs] = useState([]);
    const logsRef = useRef([]);

    const fetchFooterStats = async () => {
        try {
            const [metricsRes, securityRes] = await Promise.all([
                API.get("/metrics"),
                API.get("/security"),
            ]);
            if (metricsRes.data && securityRes.data) {
                const dur = metricsRes.data.duration_seconds || 0;
                const hh = Math.floor(dur / 3600).toString().padStart(2, "0");
                const mm = Math.floor((dur % 3600) / 60).toString().padStart(2, "0");
                const ss = Math.floor(dur % 60).toString().padStart(2, "0");
                const alerts = securityRes.data.current_session || 0;
                setStats({ session_id: metricsRes.data.session_id || "-", active_alerts: alerts, running_time: `${hh}:${mm}:${ss}` });
                // Threat level based on alerts
                if (alerts === 0) setThreatLevel(0);
                else if (alerts < 3) setThreatLevel(1);
                else if (alerts < 8) setThreatLevel(2);
                else setThreatLevel(3);
            }
        } catch (e) { /* silent */ }
    };

    // Generate live log entries
    useEffect(() => {
        const addLog = () => {
            const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
            const ip = randomIP();
            const now = new Date().toTimeString().slice(0, 8);
            const entry = `${now} ${template(ip)}`;
            logsRef.current = [entry, ...logsRef.current].slice(0, 6);
            setLogs([...logsRef.current]);
        };
        addLog();
        const t = setInterval(addLog, 2200);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        fetchFooterStats();
        const t = setInterval(fetchFooterStats, 5000);
        return () => clearInterval(t);
    }, []);

    const threatColors = ["text-emerald-400", "text-amber-400", "text-orange-400", "text-rose-400"];
    const threatBg = ["rgba(16,185,129,0.15)", "rgba(245,158,11,0.15)", "rgba(249,115,22,0.15)", "rgba(244,63,94,0.15)"];
    const threatBarColors = ["#10b981", "#f59e0b", "#f97316", "#f43f5e"];

    return (
        <footer
            className="border-t"
            style={{
                background: "rgba(5, 8, 16, 0.95)",
                borderColor: "rgba(30, 41, 59, 0.7)",
                boxShadow: "0 -1px 0 rgba(59,130,246,0.08)",
            }}
        >
            {/* Main footer row */}
            <div className="py-2 px-6 flex flex-wrap justify-between items-center gap-3">
                {/* Terminal log */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FaTerminal className="text-blue-500/60 text-[10px] flex-shrink-0 animate-pulse" />
                    <div className="overflow-hidden max-w-[380px]">
                        <div
                            className="text-[10px] font-mono text-slate-500 truncate transition-all duration-500"
                            key={logs[0]}
                        >
                            <span className="text-blue-500/70 mr-1">$</span>
                            {logs[0] || "Waiting for traffic..."}
                            <span className="animate-blink text-blue-400 ml-0.5">█</span>
                        </div>
                    </div>
                </div>

                {/* Session info */}
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <FaHdd className="text-slate-600 text-[9px]" />
                        <span className="text-slate-600">SESSION</span>
                        <span className="text-slate-400">#{stats.session_id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <FaClock className="text-slate-600 text-[9px]" />
                        <span className="text-slate-600">UPTIME</span>
                        <span className="text-slate-300">{stats.running_time}</span>
                    </div>
                </div>

                {/* Threat level */}
                <div
                    className="flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-mono font-bold"
                    style={{ background: threatBg[threatLevel], border: `1px solid ${threatBarColors[threatLevel]}30` }}
                >
                    <FaShieldAlt style={{ color: threatBarColors[threatLevel], fontSize: "9px" }} />
                    <span className="text-slate-500">THREAT</span>
                    <span style={{ color: threatBarColors[threatLevel] }}>{THREAT_LEVELS[threatLevel]}</span>
                    <span className="text-slate-600 mx-1">·</span>
                    <span className="text-slate-500">ALERTS</span>
                    <span style={{ color: threatBarColors[threatLevel] }}>{stats.active_alerts}</span>
                </div>
            </div>

            {/* Threat level bar */}
            <div
                className="h-[2px] w-full relative overflow-hidden"
                style={{ background: "rgba(30,41,59,0.5)" }}
            >
                <div
                    className="h-full transition-all duration-1000"
                    style={{
                        width: `${((threatLevel + 1) / 4) * 100}%`,
                        background: `linear-gradient(90deg, ${threatBarColors[0]}, ${threatBarColors[threatLevel]})`,
                        boxShadow: `0 0 8px ${threatBarColors[threatLevel]}`,
                    }}
                />
                {/* Scanning line effect */}
                <div
                    className="absolute top-0 h-full w-12 opacity-60"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${threatBarColors[threatLevel]}80, transparent)`,
                        animation: "ticker-scroll 2s linear infinite",
                    }}
                />
            </div>
        </footer>
    );
}

export default Footer;
