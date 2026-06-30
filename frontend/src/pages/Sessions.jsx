import { useEffect, useState } from "react";
import { FaDatabase, FaSync, FaCircle, FaTrashAlt } from "react-icons/fa";
import API from "../services/api";

function Sessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const loadSessions = async () => {
        try {
            const response = await API.get("/sessions");
            if (response.data) {
                const mapped = response.data.map((sess) => ({
                    id: sess[0],
                    startTime: sess[1],
                    endTime: sess[2] || "-",
                    totalPackets: sess[3] || 0,
                    status: sess[4] || "Unknown"
                }));
                setSessions(mapped);
            }
            setLoading(false);
        } catch (error) {
            console.error("Sessions Fetch Error:", error);
            setLoading(false);
        }
    };

    const handleDeleteSession = async (sessId) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete session #${sessId}? This will remove all associated packets and threat alerts.`);
        if (!confirmDelete) return;

        setActionLoading(true);
        try {
            const res = await API.delete(`/sessions/${sessId}`);
            if (res.data && res.data.status === "success") {
                alert(res.data.message);
                loadSessions();
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete session.");
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
        const timer = setInterval(loadSessions, 10000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]/60">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Database Session Logs</h1>
                    <p className="text-xs text-slate-400">Browse historical capturing runs, active packet counts, and session markers.</p>
                </div>

                <button 
                    onClick={loadSessions}
                    className="flex items-center gap-2 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-xs px-3.5 py-2 rounded-lg transition font-semibold"
                >
                    <FaSync className={`${loading ? "animate-spin" : ""}`} />
                    <span>REFRESH</span>
                </button>
            </div>

            {/* Session Grid / Cards */}
            <div className="bg-[#111726] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
                <div className="p-5 border-b border-[#1e293b] bg-[#0e1320] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <FaDatabase />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Session Registry</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Neon PostgreSQL</p>
                    </div>
                    {sessions.some(s => s.status === "Running") && (
                        <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-3 py-1.5 rounded-lg">
                            <FaCircle className="text-[6px] animate-pulse" />
                            <span>Live capture in progress — packet count updates every 5s</span>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-[#0e1320] text-slate-400 font-semibold border-b border-[#1e293b]">
                                <th className="py-3 px-5">Session ID</th>
                                <th className="py-3 px-5">Start Time</th>
                                <th className="py-3 px-5">End Time</th>
                                <th className="py-3 px-5 text-right font-mono">Total Packets</th>
                                <th className="py-3 px-5 text-center">Status</th>
                                <th className="py-3 px-5 text-center w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                                        No database sessions discovered.
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-[#161f30]/40 transition duration-150">
                                        <td className="py-3.5 px-5 font-bold text-white font-mono">
                                            #{sess.id}
                                        </td>
                                        <td className="py-3.5 px-5 text-slate-300 font-mono">
                                            {sess.startTime}
                                        </td>
                                        <td className="py-3.5 px-5 text-slate-400 font-mono">
                                            {sess.endTime}
                                        </td>
                                        <td className="py-3.5 px-5 text-right text-blue-400 font-mono font-semibold">
                                            {sess.totalPackets.toLocaleString()}
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                sess.status === "Running"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                            }`}>
                                                <FaCircle className={`text-[6px] ${
                                                    sess.status === "Running" ? "animate-pulse" : ""
                                                }`} />
                                                {sess.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            <button
                                                disabled={actionLoading || sess.status === "Running"}
                                                onClick={() => handleDeleteSession(sess.id)}
                                                className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white disabled:opacity-20 border border-rose-500/20 p-2 rounded transition"
                                                title={sess.status === "Running" ? "Active captures cannot be deleted." : "Purge session record"}
                                            >
                                                <FaTrashAlt className="text-xs" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Sessions;
