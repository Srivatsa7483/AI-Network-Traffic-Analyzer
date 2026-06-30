import { useEffect, useState } from "react";
import { FaArrowUp, FaArrowDown, FaExclamationTriangle } from "react-icons/fa";
import API from "../services/api";

function TopIPs() {
    const [ips, setIps] = useState({ top_source_ip: null, top_destination_ip: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadIPs = async () => {
        try {
            const response = await API.get("/top-ips");
            if (response.data) {
                setIps(response.data);
                setError(false);
            }
        } catch (err) {
            console.error("Top IPs Fetch Error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIPs();
        const timer = setInterval(loadIPs, 6000);
        return () => clearInterval(timer);
    }, []);

    const display = (val) => val || <span className="text-slate-600 italic">No data yet</span>;

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0,1].map(i => (
                <div key={i} className="bg-[#161f30] border border-[#1e293b] rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 bg-slate-700 rounded-lg shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-2 bg-slate-700 rounded w-20" />
                        <div className="h-3 bg-slate-700 rounded w-32" />
                    </div>
                </div>
            ))}
        </div>
    );

    if (error) return (
        <div className="flex items-center gap-2 text-xs text-rose-400 p-4">
            <FaExclamationTriangle /> Unable to load IP data.
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#161f30] border border-[#1e293b] rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                    <FaArrowUp />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Top Source IP</span>
                    <span className="text-white text-xs font-mono font-bold truncate block select-all">
                        {display(ips.top_source_ip)}
                    </span>
                </div>
            </div>
            <div className="bg-[#161f30] border border-[#1e293b] rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
                    <FaArrowDown />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Top Destination IP</span>
                    <span className="text-white text-xs font-mono font-bold truncate block select-all">
                        {display(ips.top_destination_ip)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default TopIPs;
