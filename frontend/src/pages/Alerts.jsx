import { useEffect, useState } from "react";
import { FaShieldAlt, FaExclamationTriangle, FaBell, FaSync } from "react-icons/fa";
import API from "../services/api";
import AlertsTable from "../components/AlertsTable";
import StatCard from "../components/StatCard";

function Alerts() {
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState({});
    const [stats, setStats] = useState({
        total_alerts: 0,
        current_session: 0
    });
    const [loading, setLoading] = useState(true);

    const loadAlertData = async () => {
        try {
            const historyRes = await API.get("/alerts/history");
            const summaryRes = await API.get("/alerts/summary");
            const statsRes = await API.get("/security");

            if (historyRes.data) setHistory(historyRes.data);
            if (summaryRes.data) setSummary(summaryRes.data);
            if (statsRes.data) setStats(statsRes.data);

            setLoading(false);
        } catch (error) {
            console.error("Alerts Page Fetch Error:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlertData();
        const timer = setInterval(loadAlertData, 8000);
        return () => clearInterval(timer);
    }, []);

    // Find the most common alert type
    const getTopThreatType = () => {
        const entries = Object.entries(summary);
        if (entries.length === 0) return "NONE";
        // Sort by count descending
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0].replace("_", " ");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]/60">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Threat Center</h1>
                    <p className="text-xs text-slate-400">Security event signatures, anomaly detections, and host reputations.</p>
                </div>

                <button 
                    onClick={loadAlertData}
                    className="flex items-center gap-2 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-xs px-3.5 py-2 rounded-lg transition font-semibold"
                >
                    <FaSync className={`${loading ? "animate-spin" : ""}`} />
                    <span>REFRESH</span>
                </button>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <StatCard
                    title="Total Flagged Alerts"
                    value={stats.total_alerts}
                    unit="alerts"
                    color="red"
                    icon={<FaShieldAlt className="text-rose-500" />}
                />
                <StatCard
                    title="Current Session Alerts"
                    value={stats.current_session}
                    unit="active"
                    color="yellow"
                    icon={<FaBell className="text-amber-400 font-bold" />}
                />
                <StatCard
                    title="Dominant Attack Vector"
                    value={getTopThreatType()}
                    unit=""
                    color="purple"
                    icon={<FaExclamationTriangle className="text-indigo-400" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Summary Breakdown */}
                <div className="lg:col-span-1 bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg h-fit">
                    <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Classification Breakdown</h2>
                    <div className="space-y-4">
                        {Object.entries(summary).length === 0 ? (
                            <p className="text-slate-500 text-xs">No classification metrics generated.</p>
                        ) : (
                            Object.entries(summary).map(([type, count]) => {
                                const total = stats.total_alerts || 1;
                                const percentage = ((count / total) * 100).toFixed(0);

                                return (
                                    <div key={type} className="text-xs">
                                        <div className="flex justify-between font-mono font-medium mb-1.5 text-slate-300">
                                            <span className="font-semibold text-white tracking-wider">{type.replace("_", " ")}</span>
                                            <span>{count} ({percentage}%)</span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full bg-[#161f30] rounded-full h-1.5 border border-[#1e293b]/50">
                                            <div 
                                                className="bg-indigo-600 h-1.5 rounded-full" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Alerts Table */}
                <div className="lg:col-span-2">
                    <AlertsTable alerts={history} title="System Threat Log" />
                </div>
            </div>
        </div>
    );
}

export default Alerts;
