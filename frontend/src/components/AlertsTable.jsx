import { useState } from "react";
import { FaShieldAlt, FaSearch } from "react-icons/fa";

function AlertsTable({ alerts = [], title = "Threat Alerts Log", limit = null }) {
    const [search, setSearch] = useState("");

    // Standardize alert format (objects vs arrays)
    const formattedAlerts = alerts.map((alert) => {
        if (Array.isArray(alert)) {
            return {
                id: alert[0],
                sessionId: alert[1],
                timestamp: alert[2],
                severity: alert[3] ? alert[3].toUpperCase() : "LOW",
                type: alert[4] || "UNKNOWN",
                sourceIp: alert[5] || "-",
                description: alert[6] || ""
            };
        } else {
            return {
                id: alert.id || Math.random(),
                sessionId: alert.session_id,
                timestamp: alert.timestamp,
                severity: alert.severity ? alert.severity.toUpperCase() : "LOW",
                type: alert.type || alert.threat_type || "UNKNOWN",
                sourceIp: alert.source_ip || "-",
                description: alert.description || ""
            };
        }
    });

    const filteredAlerts = formattedAlerts.filter((alert) => {
        return (
            alert.type.toLowerCase().includes(search.toLowerCase()) ||
            alert.sourceIp.toLowerCase().includes(search.toLowerCase()) ||
            alert.description.toLowerCase().includes(search.toLowerCase()) ||
            alert.severity.toLowerCase().includes(search.toLowerCase())
        );
    });

    const displayAlerts = limit ? filteredAlerts.slice(0, limit) : filteredAlerts;

    const severityStyles = {
        CRITICAL: "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold",
        HIGH: "bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold",
        MEDIUM: "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium",
        LOW: "bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium"
    };

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
            {/* Header / Filter tool */}
            <div className="p-5 border-b border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e1320]">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 animate-pulse-slow">
                        <FaShieldAlt />
                    </div>
                    <div>
                        <h2 className="text-md font-bold text-white">{title}</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Threat Detection System</p>
                    </div>
                </div>

                {!limit && (
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
                            <FaSearch />
                        </span>
                        <input
                            type="text"
                            placeholder="Filter alerts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-[#161f30] border border-[#1e293b] focus:border-blue-500 outline-none text-slate-200 text-xs rounded-lg pl-9 pr-4 py-2 w-52 transition font-medium"
                        />
                    </div>
                )}
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-[#0e1320] text-slate-400 font-semibold border-b border-[#1e293b]">
                            <th className="py-3 px-5">Time</th>
                            <th className="py-3 px-5">Threat Type</th>
                            <th className="py-3 px-5 text-center">Severity</th>
                            <th className="py-3 px-5">Source IP</th>
                            <th className="py-3 px-5">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                        {displayAlerts.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-slate-500 font-medium">
                                    No alerts logged. System secure.
                                </td>
                            </tr>
                        ) : (
                            displayAlerts.map((alert) => (
                                <tr key={alert.id} className="hover:bg-[#161f30]/40 transition duration-150">
                                    <td className="py-3.5 px-5 text-slate-400 font-mono">
                                        {alert.timestamp}
                                    </td>
                                    <td className="py-3.5 px-5 text-white font-semibold tracking-wider font-mono">
                                        {alert.type}
                                    </td>
                                    <td className="py-3.5 px-5 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide uppercase ${
                                            severityStyles[alert.severity] || severityStyles.LOW
                                        }`}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-300 font-mono font-semibold">
                                        {alert.sourceIp}
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-300">
                                        {alert.description}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AlertsTable;
