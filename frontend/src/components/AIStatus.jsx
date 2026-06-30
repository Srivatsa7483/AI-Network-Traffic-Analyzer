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

    const fetchAIInfo = async () => {
        try {
            const statusRes = await API.get("/ai/status");
            const statsRes = await API.get("/ai/statistics");
            
            setStatusInfo({
                model: statusRes.data.model || "Isolation Forest",
                status: statusRes.data.status ? statusRes.data.status.toUpperCase() : "LOADED",
                algorithm: "Isolation Forest (Unsupervised)",
                window_size: 100, // Capped at 100 packets
                features: 10,     // Total features extracted
                detections: statsRes.data.detections || 0
            });
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

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <FaRobot />
                    </div>
                    <div>
                        <h2 className="text-md font-bold text-white">AI Detection Core</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Cognitive Telemetry</p>
                    </div>
                </div>

                <div className={`flex items-center gap-1.5 border px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    statusColors[statusInfo.status] || statusColors.LOADING
                }`}>
                    {statusInfo.status === "LOADED" ? <FaCheckCircle /> : <FaExclamationCircle />}
                    <span>{statusInfo.status}</span>
                </div>
            </div>

            {/* Metrics Rows */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#1e293b]/50">
                    <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Active Model</span>
                        <span className="text-white font-semibold text-xs">{statusInfo.model}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Algorithm</span>
                        <span className="text-slate-300 text-xs">{statusInfo.algorithm}</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="text-center bg-[#161f30]/40 border border-[#1e293b]/30 p-2.5 rounded-lg">
                        <span className="text-[20px] font-extrabold text-indigo-400 block font-mono">
                            {statusInfo.window_size}
                        </span>
                        <span className="text-slate-500 text-[9px] uppercase font-bold block mt-0.5">Window Packets</span>
                    </div>
                    <div className="text-center bg-[#161f30]/40 border border-[#1e293b]/30 p-2.5 rounded-lg">
                        <span className="text-[20px] font-extrabold text-indigo-400 block font-mono">
                            {statusInfo.features}
                        </span>
                        <span className="text-slate-500 text-[9px] uppercase font-bold block mt-0.5">ML Features</span>
                    </div>
                    <div className="text-center bg-[#161f30]/40 border border-[#1e293b]/30 p-2.5 rounded-lg">
                        <span className="text-[20px] font-extrabold text-rose-400 block font-mono">
                            {statusInfo.detections}
                        </span>
                        <span className="text-slate-500 text-[9px] uppercase font-bold block mt-0.5">Detections</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AIStatus;
