import { useEffect, useState } from "react";
import { FaPlug, FaExclamationTriangle } from "react-icons/fa";
import API from "../services/api";

function TopPorts() {
    const [ports, setPorts] = useState({ top_source_port: null, top_destination_port: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadPorts = async () => {
        try {
            const response = await API.get("/ports");
            if (response.data) {
                setPorts(response.data);
                setError(false);
            }
        } catch (err) {
            console.error("Top Ports Fetch Error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPorts();
        const timer = setInterval(loadPorts, 6000);
        return () => clearInterval(timer);
    }, []);

    const display = (val) => (val !== null && val !== undefined) ? val : <span className="text-slate-600 italic">No data yet</span>;

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0,1].map(i => (
                <div key={i} className="bg-[#161f30] border border-[#1e293b] rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 bg-slate-700 rounded-lg shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-2 bg-slate-700 rounded w-20" />
                        <div className="h-3 bg-slate-700 rounded w-16" />
                    </div>
                </div>
            ))}
        </div>
    );

    if (error) return (
        <div className="flex items-center gap-2 text-xs text-rose-400 p-4">
            <FaExclamationTriangle /> Unable to load port data.
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#161f30] border border-[#1e293b] rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 shrink-0">
                    <FaPlug />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Top Source Port</span>
                    <span className="text-white text-base font-mono font-bold truncate block select-all">
                        {display(ports.top_source_port)}
                    </span>
                </div>
            </div>
            <div className="bg-[#161f30] border border-[#1e293b] rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400 shrink-0">
                    <FaPlug />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Top Destination Port</span>
                    <span className="text-white text-base font-mono font-bold truncate block select-all">
                        {display(ports.top_destination_port)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default TopPorts;
