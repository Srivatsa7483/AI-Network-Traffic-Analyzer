import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUserPlus, FaUser, FaLock, FaEnvelope, FaExclamationTriangle, FaUserTag } from "react-icons/fa";


function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState("Analyst");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!username || !email || !password || !confirmPassword) {
            setError("All operator fields are required");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await register(username, email, password, role);
            setSuccess("Registration successful! Decrypting keys...");
            setTimeout(() => {
                navigate("/login");
            }, 1500);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || "Failed to register operator credentials";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const roleDetails = {
        Admin: "Full privileges: control captures, train models, delete sessions.",
        Analyst: "Standard clearance: read live captures, view ML anomalies, view threat events.",
        Guest: "Restricted clearance: view global dashboard counters and stats only."
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
                        background: "radial-gradient(circle at top right, #10b981, transparent 70%)",
                    }}
                />

                {/* Logo and title */}
                <div className="flex flex-col items-center mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 relative">
                        <div className="absolute animate-ring-scan rounded-full border border-emerald-400" style={{ width: "30px", height: "30px" }} />
                        <FaUserPlus className="text-white text-md" />
                    </div>
                    <h2
                        className="text-lg font-extrabold tracking-widest uppercase text-center"
                        style={{
                            background: "linear-gradient(90deg, #d1fae5, #6ee7b7, #10b981)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Credential Registry
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                        Register Security Operator
                    </p>
                </div>

                {/* Messages Banners */}
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

                {success && (
                    <div
                        className="mb-5 p-3 rounded-lg border flex items-center gap-2.5 text-xs text-emerald-400 font-mono animate-slide-up"
                        style={{
                            background: "rgba(16,185,129,0.08)",
                            borderColor: "rgba(16,185,129,0.3)",
                            boxShadow: "0 0 12px rgba(16,185,129,0.1)",
                        }}
                    >
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5 font-mono">
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Operator Username
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                                <FaUser />
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                                placeholder="Operator handle"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                                <FaEnvelope />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                                placeholder="operator@domain.com"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                                    <FaLock />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                                    placeholder="Password"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                                Confirm
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                                    <FaLock />
                                </span>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                                    placeholder="Confirm"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Clearance Role Assignment
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                                <FaUserTag />
                            </span>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono appearance-none"
                                disabled={loading}
                            >
                                <option value="Analyst">Analyst (Read Operations)</option>
                                <option value="Admin">Admin (Control Operations)</option>
                                <option value="Guest">Guest (Read Stats Only)</option>
                            </select>
                        </div>
                        {/* Dynamic Clearance Description */}
                        <p className="text-[9px] text-slate-500 font-mono mt-1 leading-normal italic">
                            Clearance: {roleDetails[role]}
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 group cursor-pointer"
                        style={{
                            boxShadow: "0 0 16px rgba(16,185,129,0.3)",
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Register Operator</span>
                            </>
                        )}
                        <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </form>

                {/* Footer links */}
                <div className="mt-6 pt-4 border-t border-[#1e293b]/60 flex justify-between text-[11px] font-mono text-slate-500">
                    <span>Already registered?</span>
                    <Link to="/login" className="text-emerald-400 hover:underline hover:text-emerald-300">
                        Login Node
                    </Link>
                </div>
            </div>
    );
}

export default Register;
