import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaShieldAlt } from "react-icons/fa";

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <div className="relative flex items-center justify-center">
                    <div className="h-10 w-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <FaShieldAlt className="absolute text-blue-500/40 text-sm" />
                </div>
                <p className="text-xs text-slate-500 font-mono tracking-widest uppercase animate-pulse">
                    Decrypting Access Keys...
                </p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role verification
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] max-w-md mx-auto text-center gap-4 animate-slide-up">
                <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl shadow-lg shadow-rose-900/10">
                    <FaShieldAlt />
                </div>
                <div>
                    <h2 className="text-md font-bold text-rose-400 uppercase tracking-widest font-mono">
                        Clearance Level Insufficient
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-2">
                        Required role: {allowedRoles.join(" / ")}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                        Your account is currently flagged as: <strong>{user.role}</strong>
                    </p>
                </div>
            </div>
        );
    }

    return children;
}

export default ProtectedRoute;
