import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaNetworkWired, FaServer, FaShieldAlt, FaSatelliteDish } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// Ticker messages that scroll across the bottom of the navbar
const TICKER_TEMPLATES = [
    "PACKET_RATE monitor active",
    "Deep packet inspection enabled",
    "IDS engine: RUNNING",
    "Firewall rules loaded: 247",
    "TLS fingerprinting active",
    "ARP spoofing detection: ON",
    "DNS anomaly detection: ENABLED",
    "Port scan detection threshold: 50/s",
    "Bandwidth threshold: 100 Mbps",
    "ML anomaly model: v2.1.0 loaded",
    "Connection tracking: ACTIVE",
    "GeoIP database: 2024-Q4",
];

function Navbar() {
    const { user, logout } = useAuth();
    const [status, setStatus] = useState("CONNECTING");
    const [alertCount, setAlertCount] = useState(0);
    const [packetCount, setPacketCount] = useState(0);
    const [tickerItems, setTickerItems] = useState([...TICKER_TEMPLATES, ...TICKER_TEMPLATES]);
    const prevPackets = useRef(0);
    const prevAlerts = useRef(0);
    const [packetFlash, setPacketFlash] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(
        localStorage.getItem("active_theme") || "cyberpunk"
    );

    // Anomaly Toast states
    const [toastActive, setToastActive] = useState(false);
    const [latestAlert, setLatestAlert] = useState(null);

    const playChime = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const playBeep = (freq, duration, startTime) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.setValueAtTime(freq, startTime);
                osc.type = "sine";
                gain.gain.setValueAtTime(0.12, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            const now = audioCtx.currentTime;
            playBeep(587.33, 0.12, now); // D5 chord
            playBeep(880.00, 0.25, now + 0.08); // A5 chord
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    };

    // Sync theme if changed elsewhere (e.g. Settings page)
    useEffect(() => {
        const handleThemeChange = () => {
            setCurrentTheme(localStorage.getItem("active_theme") || "cyberpunk");
        };
        window.addEventListener("theme-changed", handleThemeChange);
        return () => window.removeEventListener("theme-changed", handleThemeChange);
    }, []);

    const cycleTheme = () => {
        const themes = ["cyberpunk", "matrix", "threat", "obsidian"];
        const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
        const nextTheme = themes[nextIdx];
        
        document.documentElement.classList.remove("theme-cyberpunk", "theme-matrix", "theme-threat", "theme-obsidian");
        document.documentElement.classList.add(`theme-${nextTheme}`);
        localStorage.setItem("active_theme", nextTheme);
        setCurrentTheme(nextTheme);
        window.dispatchEvent(new Event("theme-changed"));
    };

    const checkSystemHealth = async () => {
        try {
            const response = await API.get("/health");
            if (response.data && response.data.status === "healthy") {
                setStatus("ONLINE");
            } else {
                setStatus("DEGRADED");
            }
        } catch (error) {
            setStatus("OFFLINE");
        }
    };

    const fetchLiveData = async () => {
        try {
            const [alertsRes, metricsRes] = await Promise.all([
                API.get("/security"),
                API.get("/metrics"),
            ]);
            
            if (alertsRes.data) {
                const newAlerts = alertsRes.data.total_alerts || 0;
                // If a new alert has triggered
                if (newAlerts > prevAlerts.current) {
                    if (prevAlerts.current > 0) {
                        try {
                            const alertsDetails = await API.get("/alerts");
                            if (alertsDetails.data && alertsDetails.data.length > 0) {
                                const latest = alertsDetails.data[0];
                                setLatestAlert({
                                    id: latest[0],
                                    timestamp: latest[2],
                                    severity: latest[3],
                                    type: latest[4],
                                    source: latest[5],
                                    desc: latest[6]
                                });
                                setToastActive(true);
                                playChime();
                                // Hide after 6 seconds
                                setTimeout(() => setToastActive(false), 6000);
                            }
                        } catch (err) {
                            console.error("Toast Fetch Error:", err);
                        }
                    }
                    prevAlerts.current = newAlerts;
                }
                setAlertCount(newAlerts);
            }
            
            if (metricsRes.data) {
                const newCount = metricsRes.data.total_packets || 0;
                if (newCount !== prevPackets.current) {
                    setPacketFlash(true);
                    setTimeout(() => setPacketFlash(false), 300);
                }
                setPacketCount(newCount);
                prevPackets.current = newCount;
            }
        } catch (error) {
            // silent
        }
    };

    useEffect(() => {
        checkSystemHealth();
        fetchLiveData();
        const timer = setInterval(() => {
            checkSystemHealth();
            fetchLiveData();
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const statusConfig = {
        ONLINE: {
            classes: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
            dot: "bg-emerald-400 animate-glow-pulse",
            ring: "border-emerald-400",
        },
        DEGRADED: {
            classes: "text-amber-400 border-amber-500/30 bg-amber-500/10",
            dot: "bg-amber-400 animate-pulse",
            ring: "border-amber-400",
        },
        OFFLINE: {
            classes: "text-rose-400 border-rose-500/30 bg-rose-500/10",
            dot: "bg-rose-400 animate-threat-glow",
            ring: "border-rose-400",
        },
        CONNECTING: {
            classes: "text-blue-400 border-blue-500/30 bg-blue-500/10",
            dot: "bg-blue-400 animate-pulse",
            ring: "border-blue-400",
        },
    };

    const cfg = statusConfig[status] || statusConfig.CONNECTING;

    return (
        <header
            className="border-b border-[#1e293b] flex flex-col shadow-2xl"
            style={{
                background: "rgba(8, 11, 17, 0.92)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 1px 0 rgba(59,130,246,0.15), 0 4px 24px rgba(0,0,0,0.6)",
            }}
        >
            {/* Main bar */}
            <div className="py-3 px-6 flex justify-between items-center">
                {/* Logo Section */}
                <div className="flex items-center gap-3.5">
                    {/* Animated logo icon */}
                    <div className="relative h-10 w-10 flex items-center justify-center">
                        {/* Outer spinning ring */}
                        <div
                            className="absolute inset-0 rounded-full animate-spin-slow"
                            style={{
                                background: "conic-gradient(from 0deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.8) 50%, rgba(59,130,246,0) 100%)",
                                padding: "1.5px",
                            }}
                        >
                            <div className="w-full h-full rounded-full" style={{ background: "#080b11" }} />
                        </div>
                        {/* Inner scanning ring */}
                        <div
                            className="absolute animate-ring-scan rounded-full"
                            style={{
                                width: "24px",
                                height: "24px",
                                border: "1.5px solid rgba(59,130,246,0.6)",
                            }}
                        />
                        {/* Core icon */}
                        <div
                            className="relative z-10 h-8 w-8 rounded-xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #1d4ed8, #4f46e5)",
                                boxShadow: "0 0 16px rgba(59,130,246,0.6)",
                            }}
                        >
                            <FaNetworkWired className="text-white text-sm" />
                        </div>
                    </div>

                    <div>
                        <h1
                            className="text-sm font-extrabold tracking-widest uppercase"
                            style={{
                                background: "linear-gradient(90deg, #e0f2fe, #93c5fd, #818cf8)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                letterSpacing: "0.12em",
                            }}
                        >
                            AI Network Traffic Analyzer
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold font-mono">
                                Security Operations Center · v1.1.0
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right diagnostics */}
                <div className="flex items-center gap-3">
                    {/* Live Packet Counter */}
                    <div
                        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                            packetFlash
                                ? "bg-blue-500/20 border-blue-400/60 text-blue-300"
                                : "bg-[#0d1626] border-[#1e293b] text-slate-400"
                        } transition-all duration-200`}
                    >
                        <FaSatelliteDish className="text-blue-400 text-[10px]" />
                        <span className="text-slate-500 text-[10px]">PKTS:</span>
                        <span className={`font-bold ${packetFlash ? "text-blue-300" : "text-slate-200"}`}>
                            {packetCount.toLocaleString()}
                        </span>
                    </div>

                    {/* Connection Status Badge */}
                    <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider ${cfg.classes}`}>
                        <div className="relative flex items-center justify-center h-3 w-3">
                            <span className={`absolute h-3 w-3 rounded-full opacity-50 animate-ring-scan border ${cfg.ring}`} />
                            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        </div>
                        <span className="font-mono text-[11px]">{status}</span>
                    </div>

                    {/* Threat Badge */}
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all duration-300 ${
                            alertCount > 0
                                ? "bg-rose-500/15 border-rose-500/40 text-rose-400 animate-threat-glow"
                                : "bg-[#0d1626] border-[#1e293b] text-slate-400"
                        }`}
                    >
                        <FaShieldAlt className={alertCount > 0 ? "text-rose-400" : "text-slate-500"} />
                        <span className="text-[10px] text-slate-500">ALERTS</span>
                        <span className={`font-extrabold ${alertCount > 0 ? "text-rose-300" : "text-slate-300"}`}>
                            {alertCount}
                        </span>
                    </div>

                    {/* API endpoint */}
                    <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-slate-600 border border-[#1e293b] bg-[#0d1626] px-2.5 py-1.5 rounded-lg">
                        <FaServer className="text-slate-600" />
                        <span className="text-slate-500">API</span>
                        <span className="text-slate-400">127.0.0.1:5000</span>
                    </div>

                    {/* Theme Toggle Button */}
                    <button
                        onClick={cycleTheme}
                        className="bg-[#0d1626] hover:bg-[#162238] border border-[#1e293b] text-slate-400 hover:text-blue-400 p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1"
                        title={`Cycle Interface Theme (Active: ${currentTheme})`}
                    >
                        <span>🎨</span>
                    </button>

                    {/* Operator Clearances */}
                    {user && (
                        <div className="flex items-center gap-2 border-l border-[#1e293b] pl-3">
                            <Link to="/profile" className="flex items-center gap-1.5 hover:text-blue-400 transition" title="View Clearance Profile">
                                <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono shadow-inner shadow-blue-500/10">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden xl:flex flex-col text-left">
                                    <span className="text-[10px] font-mono font-bold text-slate-300 leading-none">
                                        {user.username}
                                    </span>
                                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-0.5 leading-none">
                                        {user.role}
                                    </span>
                                </div>
                            </Link>
                            <button
                                onClick={logout}
                                className="text-slate-500 hover:text-rose-400 text-[10px] uppercase font-mono font-bold border border-[#1e293b] hover:border-rose-500/40 bg-black/20 hover:bg-rose-500/5 px-2 py-1.5 rounded-lg transition"
                                title="Terminate Operational Session (Logout)"
                            >
                                LOGOUT
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Ticker strip */}
            <div
                className="overflow-hidden border-t py-1"
                style={{
                    borderColor: "rgba(59,130,246,0.1)",
                    background: "rgba(59,130,246,0.03)",
                }}
            >
                <div className="animate-ticker whitespace-nowrap flex items-center gap-0">
                    {tickerItems.map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-2 font-mono text-[10px]">
                            <span className="text-blue-500/70 mx-3">▶</span>
                            <span className="text-slate-500 uppercase tracking-wider">{item}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Custom Cyberpunk Anomaly Toast Banner */}
            {toastActive && latestAlert && (
                <div 
                    className="fixed top-20 right-6 z-50 w-80 bg-[#160c14] border border-rose-500 rounded-xl p-4 shadow-[0_0_24px_rgba(244,63,94,0.4)] flex gap-3 select-none"
                    style={{
                        animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                >
                    <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 animate-pulse flex-shrink-0">
                        🚨
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest font-mono">
                                Security Alert [{latestAlert.severity}]
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                                {latestAlert.timestamp.split(" ")[1] || latestAlert.timestamp}
                            </span>
                        </div>
                        <h4 className="text-white text-xs font-bold font-mono mt-1 uppercase truncate font-semibold">
                            {latestAlert.type.replace("_", " ")}
                        </h4>
                        <p className="text-[10px] text-slate-300 mt-1 leading-relaxed font-mono">
                            {latestAlert.desc}
                        </p>
                    </div>
                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateX(120%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </header>
    );
}

export default Navbar;