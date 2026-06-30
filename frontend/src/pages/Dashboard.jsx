import { useEffect, useState } from "react";
import {
    FaDatabase,
    FaWaveSquare,
    FaShieldAlt,
    FaArrowRight,
    FaTachometerAlt,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import API from "../services/api";

// Components
import StatCard from "../components/StatCard";
import ProtocolChart from "../components/ProtocolChart";
import TrafficChart from "../components/TrafficChart";
import TopIPs from "../components/TopIPs";
import TopPorts from "../components/TopPorts";
import AlertsTable from "../components/AlertsTable";
import ExportButtons from "../components/ExportButtons";

function Dashboard() {
    const [metrics, setMetrics] = useState({
        total_packets: 0,
        packet_rate: 0,
        bandwidth: 0,
        average_packet_size: 0,
    });

    const [alerts, setAlerts] = useState([]);
    const [securityStats, setSecurityStats] = useState({ total_alerts: 0, current_session: 0 });
    const [animIn, setAnimIn] = useState(false);

    const loadDashboardData = async () => {
        try {
            const [metricsRes, alertsRes, securityRes] = await Promise.all([
                API.get("/metrics"),
                API.get("/alerts/history"),   // DB-backed: shows all historical + current alerts
                API.get("/security"),
            ]);
            if (metricsRes.data) setMetrics(metricsRes.data);
            if (alertsRes.data) setAlerts(alertsRes.data);
            if (securityRes.data) setSecurityStats(securityRes.data);
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        }
    };

    useEffect(() => {
        loadDashboardData();
        const timer = setInterval(loadDashboardData, 5000);
        setTimeout(() => setAnimIn(true), 50);
        return () => clearInterval(timer);
    }, []);

    const panelStyle = {
        background: "rgba(11, 15, 26, 0.75)",
        border: "1px solid rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    };

    return (
        <div
            className="space-y-6"
            style={{
                opacity: animIn ? 1 : 0,
                transform: animIn ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
        >
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
                style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.5)" }}
            >
                <div className="flex items-center gap-3">
                    {/* Animated accent icon */}
                    <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(167,139,250,0.2))",
                            border: "1px solid rgba(59,130,246,0.3)",
                            boxShadow: "0 0 20px rgba(59,130,246,0.15)",
                        }}
                    >
                        <FaTachometerAlt className="text-blue-400 text-sm" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-white">
                            Security Analytics Console
                        </h1>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Real-time network telemetry · anomaly detection · threat intelligence
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/packets"
                        className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                        style={{
                            background: "rgba(59,130,246,0.1)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            color: "#93c5fd",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(59,130,246,0.2)";
                            e.currentTarget.style.boxShadow = "0 0 16px rgba(59,130,246,0.2)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(59,130,246,0.1)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        <span>Inspect Packets</span>
                        <FaArrowRight className="text-[10px]" />
                    </Link>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Packets"
                    value={metrics.total_packets.toLocaleString()}
                    unit="pkts"
                    color="blue"
                    icon={<FaDatabase className="text-blue-400" />}
                />
                <StatCard
                    title="Packet Rate"
                    value={parseFloat(metrics.packet_rate || 0).toFixed(1)}
                    unit="pkt/s"
                    color="purple"
                    icon={<FaWaveSquare className="text-violet-400" />}
                />
                <StatCard
                    title="Avg Packet Size"
                    value={parseFloat(metrics.average_packet_size || 0).toFixed(1)}
                    unit="bytes"
                    color="green"
                    icon={<FaWaveSquare className="text-emerald-400" />}
                />
                <StatCard
                    title="Threat Alerts"
                    value={securityStats.total_alerts || 0}
                    unit="total"
                    color="red"
                    icon={<FaShieldAlt className="text-rose-400" />}
                />
            </div>

            {/* Live Traffic Charts */}
            <TrafficChart />

            {/* Protocol + TopIPs/Ports */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1">
                    <ProtocolChart />
                </div>

                <div className="lg:col-span-2 space-y-5">
                    {/* Top Endpoints */}
                    <div className="rounded-2xl p-5" style={panelStyle}>
                        <div
                            className="flex items-center justify-between mb-4 pb-3"
                            style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.5)" }}
                        >
                            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                                Top Stream Endpoints
                            </h2>
                            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                                Address Statistics
                            </span>
                        </div>
                        <TopIPs />
                    </div>

                    {/* Top Ports */}
                    <div className="rounded-2xl p-5" style={panelStyle}>
                        <div
                            className="flex items-center justify-between mb-4 pb-3"
                            style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.5)" }}
                        >
                            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                                Top Port Activity
                            </h2>
                            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                                Service Ports
                            </span>
                        </div>
                        <TopPorts />
                    </div>
                </div>
            </div>

            {/* Alerts + Export */}
            <div className="space-y-5">
                <AlertsTable alerts={alerts} title="Recent Threat Detections" limit={5} />
                <ExportButtons />
            </div>
        </div>
    );
}

export default Dashboard;