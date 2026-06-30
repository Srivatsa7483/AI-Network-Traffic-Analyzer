import { useEffect, useState } from "react";
import { FaRobot, FaBrain, FaSync, FaTools, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import API from "../services/api";
import StatCard from "../components/StatCard";
import AIStatus from "../components/AIStatus";

function AI() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ model: "Isolation Forest", detections: 0 });
    const [isTraining, setIsTraining] = useState(false);
    const [trainingMsg, setTrainingMsg] = useState(null);

    const loadAIData = async () => {
        try {
            const historyRes = await API.get("/ai/history");
            const statsRes = await API.get("/ai/statistics");
            if (historyRes.data) setHistory(historyRes.data);
            if (statsRes.data) setStats(statsRes.data);
        } catch (error) {
            console.error("AI Page Fetch Error:", error);
        }
    };

    const handleRetrain = async () => {
        setIsTraining(true);
        setTrainingMsg({ type: "info", text: "Training Isolation Forest model on SQLite packet archives..." });
        try {
            const res = await API.post("/ai/train");
            if (res.data && res.data.status === "success") {
                setTrainingMsg({ type: "success", text: "Model trained successfully! Isolation Forest reloaded." });
                loadAIData();
            } else {
                setTrainingMsg({ type: "error", text: res.data.message || "Failed to retrain model." });
            }
        } catch (error) {
            const errDetail = error.response?.data?.message || "Verify you have collected at least 1,000 packets in the database.";
            setTrainingMsg({ type: "error", text: `Training Failed: ${errDetail}` });
        } finally {
            setIsTraining(false);
        }
    };

    useEffect(() => {
        loadAIData();
        const timer = setInterval(loadAIData, 8000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]/60">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">AI Center</h1>
                    <p className="text-xs text-slate-400">Cognitive telemetry using Isolation Forest unsupervised anomaly detection.</p>
                </div>

                <button 
                    onClick={loadAIData}
                    className="flex items-center gap-2 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-xs px-3.5 py-2 rounded-lg transition font-semibold"
                >
                    <FaSync />
                    <span>REFRESH</span>
                </button>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatCard
                    title="Active ML Model"
                    value="Isolation Forest"
                    unit="unsupervised"
                    color="purple"
                    icon={<FaBrain className="text-indigo-400" />}
                />
                <StatCard
                    title="Model Detections"
                    value={stats.detections}
                    unit="anomalies"
                    color="red"
                    icon={<FaRobot className="text-rose-400" />}
                />
                <StatCard
                    title="Evaluation Mode"
                    value="Outliers (2%)"
                    unit="contamination"
                    color="blue"
                    icon={<FaTools className="text-blue-400" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Model Info & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <AIStatus />

                    {/* Retrain Action Card */}
                    <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Model Training</h3>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                            Train the unsupervised Isolation Forest model on raw packet data stored in SQLite. 
                            Note: Requires at least <strong className="text-indigo-400">1,000 packets</strong> in the database.
                        </p>

                        <button
                            onClick={handleRetrain}
                            disabled={isTraining}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-800 disabled:to-indigo-800 text-white text-xs font-semibold py-2.5 rounded-lg transition shadow-lg shadow-blue-500/10"
                        >
                            {isTraining ? "TRAINING MODEL..." : "RETRAIN ML MODEL"}
                        </button>

                        {trainingMsg && (
                            <div className={`mt-4 p-3 rounded-lg border text-xs flex gap-2 items-start leading-relaxed ${
                                trainingMsg.type === "success" 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : trainingMsg.type === "info"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                                {trainingMsg.type === "success" ? (
                                    <FaCheckCircle className="shrink-0 mt-0.5" />
                                ) : (
                                    <FaExclamationTriangle className="shrink-0 mt-0.5" />
                                )}
                                <span>{trainingMsg.text}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Anomaly Score Timeline */}
                <div className="lg:col-span-2 bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Anomaly Score Timeline</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-6">Unsupervised Anomaly Scores over Time</p>
                    </div>

                    <div className="h-72">
                        {history.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                No anomaly events recorded yet. Anomalous scores appear here.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="timestamp" stroke="#475569" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                                    <YAxis stroke="#475569" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-[#0b0f19] border border-[#1e293b] p-3 rounded-lg shadow-xl text-xs">
                                                        <p className="text-slate-500 font-semibold mb-1 font-mono">{label}</p>
                                                        <p className="text-rose-400 font-bold font-mono">
                                                            Score: {payload[0].value.toFixed(4)}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="#ef4444" 
                                        strokeWidth={2} 
                                        fillOpacity={1} 
                                        fill="url(#colorScore)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AI;
