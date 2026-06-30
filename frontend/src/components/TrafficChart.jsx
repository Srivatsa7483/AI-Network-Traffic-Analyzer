import { useState, useEffect } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    AreaChart,
    Area,
    ReferenceDot,
} from "recharts";
import { FaChartLine, FaCircle } from "react-icons/fa";
import API from "../services/api";

function TrafficChart() {
    const [history, setHistory] = useState([]);

    const fetchLiveMetrics = async () => {
        try {
            const response = await API.get("/metrics");
            if (response.data) {
                const now = new Date();
                const timeLabel = now.toTimeString().split(" ")[0];

                const newDataPoint = {
                    time: timeLabel,
                    packetRate: parseFloat(response.data.packet_rate || 0),
                    bandwidth: parseFloat(response.data.bandwidth || 0) / 1024,
                };

                setHistory((prev) => {
                    const updated = [...prev, newDataPoint];
                    return updated.length > 30 ? updated.slice(1) : updated;
                });
            }
        } catch (error) {
            // silent
        }
    };

    useEffect(() => {
        fetchLiveMetrics();
        const timer = setInterval(fetchLiveMetrics, 4000);
        return () => clearInterval(timer);
    }, []);

    const CustomTooltip = ({ active, payload, label, unit, accentColor }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className="p-3 rounded-xl text-xs font-mono"
                    style={{
                        background: "rgba(8, 11, 17, 0.95)",
                        border: `1px solid ${accentColor}40`,
                        boxShadow: `0 0 16px ${accentColor}20`,
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <p className="text-slate-500 mb-1 text-[10px] tracking-wider">{label}</p>
                    <p className="font-extrabold text-sm" style={{ color: accentColor }}>
                        {payload[0].value.toFixed(2)}
                        <span className="text-slate-500 text-xs ml-1">{unit}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const latestPacket = history[history.length - 1];
    const latestBandwidth = history[history.length - 1];

    const chartCard = (children, accent, title, subtitle, glowClass) => (
        <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
                background: "rgba(11, 15, 26, 0.85)",
                border: `1px solid ${accent}20`,
                boxShadow: `0 0 32px ${accent}08, 0 4px 24px rgba(0,0,0,0.4)`,
                backdropFilter: "blur(16px)",
            }}
        >
            {/* Corner glow */}
            <div
                className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at top right, ${accent}, transparent 70%)`,
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{
                            background: `${accent}15`,
                            border: `1px solid ${accent}30`,
                            boxShadow: `0 0 12px ${accent}20`,
                        }}
                    >
                        <FaChartLine style={{ color: accent, fontSize: "14px" }} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">{title}</h2>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-semibold">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <div
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider"
                    style={{
                        background: `${accent}12`,
                        border: `1px solid ${accent}30`,
                        color: accent,
                    }}
                >
                    <FaCircle style={{ fontSize: "6px" }} className="animate-pulse" />
                    LIVE
                </div>
            </div>

            {/* Chart area */}
            <div className={`h-56 relative z-10 ${glowClass}`}>
                {children}
            </div>
        </div>
    );

    const emptyState = (
        <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="w-1.5 bg-blue-500/40 rounded-full animate-pulse"
                        style={{
                            height: `${20 + i * 8}px`,
                            animationDelay: `${i * 0.15}s`,
                        }}
                    />
                ))}
            </div>
            <p className="text-xs text-slate-600 font-mono tracking-wider">Gathering stream telemetry...</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            {/* Packet Rate */}
            {chartCard(
                history.length === 0 ? emptyState : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <defs>
                                <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid stroke="rgba(30,41,59,0.5)" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="#1e293b"
                                tick={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", fill: "#475569" }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#1e293b"
                                tick={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", fill: "#475569" }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip unit="pkt/s" accentColor="#3b82f6" />} />
                            <Line
                                type="monotone"
                                dataKey="packetRate"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 1.5 }}
                                filter="url(#glow-blue)"
                            />
                            {latestPacket && (
                                <ReferenceDot
                                    x={latestPacket.time}
                                    y={latestPacket.packetRate}
                                    r={4}
                                    fill="#3b82f6"
                                    stroke="rgba(59,130,246,0.4)"
                                    strokeWidth={8}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                ),
                "#3b82f6",
                "Packet Rate",
                "Live Timeline · pkt/s",
                "chart-glow"
            )}

            {/* Bandwidth */}
            {chartCard(
                history.length === 0 ? emptyState : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <defs>
                                <linearGradient id="gradBandwidth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid stroke="rgba(30,41,59,0.5)" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="#1e293b"
                                tick={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", fill: "#475569" }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#1e293b"
                                tick={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", fill: "#475569" }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip unit="KB/s" accentColor="#10b981" />} />
                            <Area
                                type="monotone"
                                dataKey="bandwidth"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fill="url(#gradBandwidth)"
                                dot={false}
                                activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 1.5 }}
                                filter="url(#glow-green)"
                            />
                            {latestBandwidth && (
                                <ReferenceDot
                                    x={latestBandwidth.time}
                                    y={latestBandwidth.bandwidth}
                                    r={4}
                                    fill="#10b981"
                                    stroke="rgba(16,185,129,0.4)"
                                    strokeWidth={8}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                ),
                "#10b981",
                "Bandwidth",
                "Live Timeline · KB/s",
                "chart-glow-green"
            )}
        </div>
    );
}

export default TrafficChart;
