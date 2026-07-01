import { useState, useEffect } from "react";
import { FaRobot, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import API from "../services/api";

function AIStatus() {
    const [statusInfo, setStatusInfo] = useState({
        model: "Isolation Forest",
        status: "LOADING",
        algorithm: "Isolation Forest",
        window_size: 100,
        features: 10,
        detections: 0
    });
    const [latestPrediction, setLatestPrediction] = useState(null);

    const fetchAIInfo = async () => {
        try {
            const statusRes = await API.get("/ai/status");
            const statsRes = await API.get("/ai/statistics");
            const historyRes = await API.get("/ai/history");
            
            setStatusInfo({
                model: statusRes.data.model || "Isolation Forest",
                status: statusRes.data.status ? statusRes.data.status.toUpperCase() : "LOADED",
                algorithm: "Isolation Forest (Unsupervised)",
                window_size: 100, // Capped at 100 packets
                features: 10,     // Total features extracted
                detections: statsRes.data.detections || 0
            });

            if (historyRes.data && historyRes.data.length > 0) {
                // Get the latest prediction point
                setLatestPrediction(historyRes.data[historyRes.data.length - 1]);
            }
        } catch (error) {
            setStatusInfo((prev) => ({
                ...prev,
                status: "DISABLED"
            }));
        }
    };

    useEffect(() => {
        fetchAIInfo();
        const timer = setInterval(fetchAIInfo, 5000);
        return () => clearInterval(timer);
    }, []);

    const statusColors = {
        LOADED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        TRAINING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        DISABLED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        LOADING: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case "Critical": return "text-rose-500 border-rose-500/20 bg-rose-500/10";
            case "High": return "text-orange-500 border-orange-500/20 bg-orange-500/10";
            case "Medium": return "text-amber-400 border-amber-400/20 bg-amber-400/10";
            default: return "text-emerald-400 border-emerald-400/20 bg-emerald-400/10";
        }
    };

    const getScoreBarColor = (score) => {
        if (score >= 85.0) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
        if (score >= 60.0) return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]";
        if (score >= 30.0) return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
        return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]";
    };

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col gap-5 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <FaRobot />
                    </div>
                    <div>
                        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">AI Detection Core</h2>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Cognitive Telemetry</p>
                    </div>
                </div>

                <div className={`flex items-center gap-1.5 border px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    statusColors[statusInfo.status] || statusColors.LOADING
                }`}>
                    {statusInfo.status === "LOADED" ? <FaCheckCircle /> : <FaExclamationCircle />}
                    <span>{statusInfo.status}</span>
                </div>
            </div>

            {/* Main AI Body: Split into Stats and Threat Explanation Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                {/* Left side: Model Info & Parameters */}
                <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-3.5">
                        <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block font-mono">Active Model</span>
                            <span className="text-white font-bold text-xs">{statusInfo.model}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block font-mono">Algorithm Spec</span>
                            <span className="text-slate-300 text-xs font-semibold">{statusInfo.algorithm}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-[#161f30]/40 border border-[#1e293b]/30 p-2.5 rounded-lg">
                            <span className="text-[16px] font-extrabold text-indigo-400 block font-mono leading-none">
                                {statusInfo.window_size}
                            </span>
                            <span className="text-slate-500 text-[8px] uppercase font-extrabold block mt-1 tracking-wider leading-none">Window Pkts</span>
                        </div>
                        <div className="text-center bg-[#161f30]/40 border border-[#1e293b]/30 p-2.5 rounded-lg">
                            <span className="text-[16px] font-extrabold text-indigo-400 block font-mono leading-none">
                                {statusInfo.features}
                            </span>
                            <span className="text-slate-500 text-[8px] uppercase font-extrabold block mt-1 tracking-wider leading-none">Features</span>
                        </div>
                        <div className="text-center bg-[#161f30]/40 border border-[#1e293b]/30 p-2.5 rounded-lg">
                            <span className="text-[16px] font-extrabold text-rose-400 block font-mono leading-none">
                                {statusInfo.detections}
                            </span>
                            <span className="text-slate-500 text-[8px] uppercase font-extrabold block mt-1 tracking-wider leading-none">Anomalies</span>
                        </div>
                    </div>
                </div>

                {/* Right side: Calibrated Threat Score & Reasons Explainability */}
                <div className="bg-[#161f30]/30 border border-[#1e293b]/60 rounded-xl p-4 flex flex-col justify-between min-h-[140px]">
                    {latestPrediction ? (
                        <>
                            {/* Score Row */}
                            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]/30">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Threat Score</span>
                                    <div className="text-xl font-black text-white font-mono mt-0.5">
                                        {latestPrediction.threat_score !== undefined ? latestPrediction.threat_score : 0}%
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getRiskColor(latestPrediction.risk_level || "Low")}`}>
                                    {latestPrediction.risk_level || "Low"} Risk
                                </span>
                            </div>

                            {/* Threat Progress score bar */}
                            <div className="w-full bg-[#0e1320] h-1.5 rounded-full overflow-hidden my-3 border border-[#1e293b]/40">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(latestPrediction.threat_score !== undefined ? latestPrediction.threat_score : 0)}`}
                                    style={{ width: `${latestPrediction.threat_score !== undefined ? latestPrediction.threat_score : 0}%` }}
                                />
                            </div>

                            {/* Bullet Reasons */}
                            <div className="flex-1 mt-1 text-[11px] font-mono text-slate-300">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold mb-1">Explainability Check</span>
                                <ul className="space-y-1">
                                    {(latestPrediction.reasons || ["Baseline activity check"]).map((reason, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5 text-rose-200">
                                            <span className="text-emerald-400 font-bold">✓</span>
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Confidence Row */}
                            <div className="pt-2 border-t border-[#1e293b]/30 flex justify-between items-center text-[10px] font-mono text-slate-500 font-semibold">
                                <span>ISOLATION FOREST ENGINE</span>
                                <span className="text-slate-400 font-bold font-mono">CONFIDENCE: {latestPrediction.confidence !== undefined ? latestPrediction.confidence : 90}%</span>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 font-semibold py-8 font-mono">
                            No telemetry analyzed yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AIStatus;
