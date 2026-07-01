import { useState, useEffect } from "react";
import { FaSlidersH, FaServer, FaDatabase, FaCheckCircle, FaExclamationCircle, FaKey, FaCopy, FaTrash } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../contexts/AuthContext";

function Settings() {
    const { user } = useAuth();
    const [connStatus, setConnStatus] = useState("TESTING");
    const [connDelay, setConnDelay] = useState(0);
    const [dbStats, setDbStats] = useState({ total_packets: 0, total_alerts: 0 });
    const [currentTheme, setCurrentTheme] = useState(
        localStorage.getItem("active_theme") || "cyberpunk"
    );
    const [auditLogs, setAuditLogs] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyRole, setNewKeyRole] = useState("Analyst");
    const [generatedKey, setGeneratedKey] = useState(null);

    const changeTheme = (themeName) => {
        document.documentElement.classList.remove("theme-cyberpunk", "theme-matrix", "theme-threat", "theme-obsidian");
        document.documentElement.classList.add(`theme-${themeName}`);
        localStorage.setItem("active_theme", themeName);
        setCurrentTheme(themeName);
        // Trigger a custom event to notify other components (e.g. Navbar)
        window.dispatchEvent(new Event("theme-changed"));
    };

    const testConnection = async () => {
        setConnStatus("TESTING");
        const start = performance.now();
        try {
            const res = await API.get("/health");
            const duration = Math.round(performance.now() - start);
            if (res.data && res.data.status === "healthy") {
                setConnStatus("ONLINE");
                setConnDelay(duration);
            } else {
                setConnStatus("DEGRADED");
            }
        } catch (error) {
            setConnStatus("OFFLINE");
        }
    };

    const fetchDbStats = async () => {
        try {
            const metricsRes = await API.get("/metrics");
            const securityRes = await API.get("/security");
            setDbStats({
                total_packets: metricsRes.data?.total_packets || 0,
                total_alerts: securityRes.data?.total_alerts || 0
            });
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await API.get("/audit-logs");
            if (res.data) setAuditLogs(res.data);
        } catch (error) {
            console.error("Failed to load audit logs:", error);
        }
    };

    const fetchApiKeys = async () => {
        try {
            const res = await API.get("/api-keys");
            if (res.data) setApiKeys(res.data);
        } catch (error) {
            console.error("Failed to load API keys:", error);
        }
    };

    const handleCreateApiKey = async (e) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;
        try {
            const res = await API.post("/api-keys", {
                name: newKeyName,
                role: newKeyRole
            });
            if (res.data && res.data.status === "success") {
                setGeneratedKey(res.data.key.key_value);
                setNewKeyName("");
                fetchApiKeys();
                fetchAuditLogs();
            }
        } catch (error) {
            console.error("Failed to generate API Key:", error);
        }
    };

    const handleRevokeApiKey = async (keyId) => {
        if (!window.confirm("Are you sure you want to revoke this API Key? Any external tools using it will fail immediately.")) return;
        try {
            const res = await API.delete(`/api-keys/${keyId}`);
            if (res.data && res.data.status === "success") {
                fetchApiKeys();
                fetchAuditLogs();
            }
        } catch (error) {
            console.error("Failed to revoke API Key:", error);
        }
    };

    useEffect(() => {
        testConnection();
        fetchDbStats();
        if (user && user.role === "Admin") {
            fetchAuditLogs();
            fetchApiKeys();
        }
    }, [user]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-[#1e293b]/60">
                <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
                <p className="text-xs text-slate-400">Configure parameters for network capture, threat detection, and database status.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Threat Detection Config */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#1e293b]/40 pb-3">
                        <FaSlidersH className="text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Threat Thresholds</h2>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">Port Scan Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                10 ports / 10s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">SYN Flood Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                50 packets / 10s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">DNS Query Flood Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                100 queries / 10s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">ICMP Ping Flood Threshold</span>
                            <span className="text-white font-semibold font-mono bg-[#161f30] px-2 py-0.5 rounded border border-[#1e293b]/50">
                                100 packets / 10s
                            </span>
                        </div>
                    </div>
                </div>

                {/* API Diagnostics */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between mb-2 border-b border-[#1e293b]/40 pb-3">
                        <div className="flex items-center gap-2.5">
                            <FaServer className="text-indigo-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Engine Connection</h2>
                        </div>
                        <button
                            onClick={testConnection}
                            className="bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-[10px] px-2.5 py-1 rounded transition font-bold"
                        >
                            RETEST
                        </button>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400 font-medium">API Server Endpoint</span>
                            <span className="text-slate-300 font-mono">http://127.0.0.1:5000</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400 font-medium">Latency Ping</span>
                            <span className="text-slate-300 font-mono">{connDelay} ms</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-[#1e293b]/30">
                            <span className="text-slate-400 font-medium">Health Status</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                connStatus === "ONLINE"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : connStatus === "TESTING"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                                {connStatus === "ONLINE" ? <FaCheckCircle /> : <FaExclamationCircle />}
                                {connStatus}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Database Info */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#1e293b]/40 pb-3">
                        <FaDatabase className="text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Database Registry Status</h2>
                    </div>

                    <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider block">Database Name</span>
                            <span className="text-white font-mono text-xs">network_analyzer.db</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider block">Captured Packets</span>
                            <span className="text-blue-400 font-mono text-xs font-semibold">{dbStats.total_packets.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider block">Threat Alerts</span>
                            <span className="text-rose-400 font-mono text-xs font-semibold">{dbStats.total_alerts.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Theme Selector */}
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#1e293b]/40 pb-3">
                        <span className="text-indigo-400 font-bold">🎨</span>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Visual Interface Themes</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <button
                            onClick={() => changeTheme("cyberpunk")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "cyberpunk"
                                    ? "bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/10"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Cyberpunk Blue</span>
                            <span className="text-[10px] text-slate-500">Cobalt / Indigo Accent</span>
                        </button>

                        <button
                            onClick={() => changeTheme("matrix")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "matrix"
                                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Matrix Green</span>
                            <span className="text-[10px] text-slate-500">Code Rain / Terminal Green</span>
                        </button>

                        <button
                            onClick={() => changeTheme("threat")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "threat"
                                    ? "bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-500/10"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Threat Crimson</span>
                            <span className="text-[10px] text-slate-500">Warning Orange / Red Alert</span>
                        </button>

                        <button
                            onClick={() => changeTheme("obsidian")}
                            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                                currentTheme === "obsidian"
                                    ? "bg-white/5 border-white/30 shadow-md shadow-white/5"
                                    : "bg-[#161f30]/40 border-[#1e293b] hover:bg-[#161f30]/80"
                            }`}
                        >
                            <span className="font-bold text-white">Stealth Obsidian</span>
                            <span className="text-[10px] text-slate-500">Monochromatic Gray / White</span>
                        </button>
                    </div>
                </div>
            </div>

            {user && user.role === "Admin" && (
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between mb-2 border-b border-[#1e293b]/40 pb-3">
                        <div className="flex items-center gap-2.5">
                            <FaKey className="text-indigo-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">API Keys & Integrations</h2>
                        </div>
                    </div>

                    {/* New Key Generator */}
                    <form onSubmit={handleCreateApiKey} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-[#161f30]/30 p-4 rounded-lg border border-[#1e293b]/45">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Key Name / Description</label>
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="e.g. SIEM Forwarder, Prometheus Exporter"
                                className="w-full bg-[#0b0f19] border border-[#1e293b] text-white rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Role Access Level</label>
                            <select
                                value={newKeyRole}
                                onChange={(e) => setNewKeyRole(e.target.value)}
                                className="w-full bg-[#0b0f19] border border-[#1e293b] text-white rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="Analyst">Analyst</option>
                                <option value="Admin">Admin</option>
                                <option value="Guest">Guest</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-750 border border-indigo-500/30 text-white text-xs px-4 py-2 rounded transition font-bold"
                        >
                            GENERATE KEY
                        </button>
                    </form>

                    {/* Success notification for generated key */}
                    {generatedKey && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">🔑 Key Generated Successfully</span>
                                <button
                                    onClick={() => setGeneratedKey(null)}
                                    className="text-slate-400 hover:text-white text-xs"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-300">Copy this key value now! For security reasons, it cannot be displayed again.</p>
                            <div className="flex items-center gap-2 bg-[#0b0f19] border border-[#1e293b] p-2 rounded">
                                <code className="text-emerald-300 font-mono text-xs select-all break-all flex-1">{generatedKey}</code>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedKey);
                                        alert("API Key copied to clipboard!");
                                    }}
                                    className="text-slate-400 hover:text-white p-1 hover:bg-[#161f30] rounded transition"
                                    title="Copy key"
                                >
                                    <FaCopy className="text-xs" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active API Keys List */}
                    <div className="overflow-x-auto pt-2">
                        <table className="w-full text-left text-xs font-mono">
                            <thead>
                                <tr className="border-b border-[#1e293b]/40 text-slate-500 font-semibold">
                                    <th className="py-2.5 px-3">Name / Label</th>
                                    <th className="py-2.5 px-3">Role</th>
                                    <th className="py-2.5 px-3">Created At</th>
                                    <th className="py-2.5 px-3">Prefix</th>
                                    <th className="py-2.5 px-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e293b]/20 text-slate-300">
                                {apiKeys.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-6 text-center text-slate-500 font-semibold italic">No active API keys created.</td>
                                    </tr>
                                ) : (
                                    apiKeys.map((key) => (
                                        <tr key={key.id} className="hover:bg-[#161f30]/30 transition-colors">
                                            <td className="py-2.5 px-3 font-bold text-slate-200">{key.name}</td>
                                            <td className="py-2.5 px-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                                    key.role === "Admin"
                                                        ? "bg-rose-500/5 border-rose-500/25 text-rose-300"
                                                        : key.role === "Guest"
                                                            ? "bg-slate-500/5 border-slate-500/25 text-slate-400"
                                                            : "bg-blue-500/5 border-blue-500/25 text-blue-300"
                                                }`}>
                                                    {key.role}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-400">{key.created_at}</td>
                                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                                                {key.key_value ? `${key.key_value.slice(0, 12)}...` : ""}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <button
                                                    onClick={() => handleRevokeApiKey(key.id)}
                                                    className="text-rose-400 hover:text-white p-1.5 hover:bg-rose-500/10 rounded transition"
                                                    title="Revoke and delete key"
                                                >
                                                    <FaTrash className="text-[10px]" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {user && user.role === "Admin" && (
                <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between mb-2 border-b border-[#1e293b]/40 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-indigo-400 font-bold">📜</span>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Administrative Audit Registry</h2>
                        </div>
                        <button
                            onClick={fetchAuditLogs}
                            className="bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-[10px] px-2.5 py-1 rounded transition font-bold"
                        >
                            REFRESH
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead>
                                <tr className="border-b border-[#1e293b]/40 text-slate-500 font-semibold">
                                    <th className="py-2.5 px-3">Timestamp</th>
                                    <th className="py-2.5 px-3">Operator</th>
                                    <th className="py-2.5 px-3">Action</th>
                                    <th className="py-2.5 px-3">Details</th>
                                    <th className="py-2.5 px-3 text-right">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e293b]/20 text-slate-300">
                                {auditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-6 text-center text-slate-500 font-semibold italic">No audit records found in registry.</td>
                                    </tr>
                                ) : (
                                    auditLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-[#161f30]/30 transition-colors">
                                            <td className="py-2.5 px-3 text-slate-400">{log.timestamp}</td>
                                            <td className="py-2.5 px-3 font-bold text-sky-400">{log.username}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-indigo-500/25 text-indigo-300 bg-indigo-500/5 uppercase">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={log.details}>
                                                {log.details}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-slate-500">{log.ip_address}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;
