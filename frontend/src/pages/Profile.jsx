import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaEnvelope, FaShieldAlt, FaCalendarAlt, FaCheck, FaExclamationTriangle } from "react-icons/fa";

function Profile() {
    const { user, updateProfile } = useAuth();
    const [username, setUsername] = useState(user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!username || !email) {
            setError("All profile fields must be filled");
            return;
        }

        setLoading(true);
        try {
            await updateProfile(username, email);
            setSuccess("Operator credentials updated successfully!");
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || "Failed to update profile";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const roleColors = {
        Admin: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        Analyst: "text-blue-400 bg-blue-500/10 border-blue-500/30",
        Guest: "text-slate-400 bg-slate-500/10 border-slate-500/30"
    };

    const roleColor = roleColors[user?.role] || roleColors.Guest;

    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-slide-up">
            {/* Header */}
            <div className="pb-4 border-b border-[#1e293b]/60 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FaUser />
                </div>
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-white">Operator Profile</h1>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">
                        Security Clearance & Credentials Configuration
                    </p>
                </div>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Panel: Clearance Badge */}
                <div
                    className="md:col-span-1 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden"
                    style={{
                        background: "rgba(11, 15, 26, 0.75)",
                        border: "1px solid rgba(30, 41, 59, 0.7)",
                        backdropFilter: "blur(16px)",
                    }}
                >
                    <div className="h-16 w-16 rounded-full bg-blue-500/5 border border-blue-500/20 flex items-center justify-center text-blue-400 text-3xl shadow-lg relative">
                        <div className="absolute inset-0 rounded-full animate-pulse border border-blue-500/20" />
                        <FaUser />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-wide">{user?.username}</h2>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user?.email}</p>
                    </div>

                    <div className={`mt-2 flex items-center gap-1.5 border px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase ${roleColor}`}>
                        <FaShieldAlt className="text-[11px]" />
                        <span>{user?.role}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#1e293b]/40 w-full flex flex-col gap-1.5 text-[9px] font-mono text-slate-500 align-left">
                        <div className="flex items-center gap-1.5">
                            <FaCalendarAlt className="text-slate-600" />
                            <span>REG: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Edit Credentials */}
                <div
                    className="md:col-span-2 rounded-2xl p-6 space-y-4"
                    style={{
                        background: "rgba(11, 15, 26, 0.75)",
                        border: "1px solid rgba(30, 41, 59, 0.7)",
                        backdropFilter: "blur(16px)",
                    }}
                >
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono border-b border-[#1e293b]/40 pb-2 mb-2">
                        Modify Clearance Credentials
                    </h3>

                    {error && (
                        <div className="p-3 rounded-lg border flex items-center gap-2.5 text-xs text-rose-400 font-mono"
                            style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.3)" }}
                        >
                            <FaExclamationTriangle className="text-rose-400 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 rounded-lg border flex items-center gap-2.5 text-xs text-emerald-400 font-mono"
                            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }}
                        >
                            <FaCheck className="text-emerald-400 flex-shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-4 font-mono">
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                                Username / Identity Handle
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">
                                    <FaUser />
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                                Secure Communication Email
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">
                                    <FaEnvelope />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="py-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer"
                            style={{ boxShadow: "0 0 16px rgba(59,130,246,0.3)" }}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Update Clearance Profile"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Profile;
