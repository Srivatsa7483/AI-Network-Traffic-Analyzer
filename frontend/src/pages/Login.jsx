import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaLock, FaNetworkWired, FaExclamationTriangle } from "react-icons/fa";


function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!username || !password) {
            setError("Please fill in all credentials");
            return;
        }

        setLoading(true);
        try {
            await login(username, password);
            navigate("/");
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || "Invalid authentication credentials";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md rounded-2xl p-8 relative overflow-hidden"

                style={{
                    background: "rgba(11, 15, 26, 0.85)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    boxShadow: "0 0 32px rgba(59,130,246,0.1), 0 8px 32px rgba(0,0,0,0.6)",
                    backdropFilter: "blur(16px)",
                }}
            >
                {/* Background glow accent */}
                <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none"
                    style={{
                        background: "radial-gradient(circle at top right, #3b82f6, transparent 70%)",
                    }}
                />

                {/* Logo and title */}
                <div className="flex flex-col items-center mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 relative">
                        <div className="absolute animate-ring-scan rounded-full border border-blue-400" style={{ width: "30px", height: "30px" }} />
                        <FaNetworkWired className="text-white text-lg" />
                    </div>
                    <h2
                        className="text-lg font-extrabold tracking-widest uppercase text-center"
                        style={{
                            background: "linear-gradient(90deg, #e0f2fe, #93c5fd, #818cf8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Operations Access
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                        Secure Authentication Node
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div
                        className="mb-5 p-3 rounded-lg border flex items-center gap-2.5 text-xs text-rose-400 font-mono animate-slide-up"
                        style={{
                            background: "rgba(244,63,94,0.08)",
                            borderColor: "rgba(244,63,94,0.3)",
                            boxShadow: "0 0 12px rgba(244,63,94,0.1)",
                        }}
                    >
                        <FaExclamationTriangle className="text-rose-400 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 font-mono">
                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                            Operator Username
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">
                                <FaUser />
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                                placeholder="Enter operator login name"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                            Access Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">
                                <FaLock />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                                placeholder="Enter secure key phrase"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 group cursor-pointer"
                        style={{
                            boxShadow: "0 0 16px rgba(59,130,246,0.3)",
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Initialize Session</span>
                            </>
                        )}
                        <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </form>

                {/* Footer links */}
                <div className="mt-6 pt-4 border-t border-[#1e293b]/60 flex justify-between text-[11px] font-mono text-slate-500">
                    <span>No clearance credentials?</span>
                    <Link to="/register" className="text-blue-400 hover:underline hover:text-blue-300">
                        Create Account
                    </Link>
                </div>
            </div>
    );
}

export default Login;
