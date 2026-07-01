import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
    FaThLarge,
    FaListUl,
    FaShieldAlt,
    FaDatabase,
    FaRobot,
    FaCog,
    FaAngleLeft,
    FaAngleRight,
    FaPlay,
    FaProjectDiagram
} from "react-icons/fa";

// Hex/binary stream data for the sidebar animation
const STREAM_CHARS = "0123456789ABCDEF".split("");

function DataStream({ height = 200 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = 18;
        canvas.height = height;

        const cols = 1;
        const drops = [Math.floor(Math.random() * height)];

        let rafId;
        const draw = () => {
            ctx.fillStyle = "rgba(5, 8, 16, 0.15)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(59, 130, 246, 0.55)";
            ctx.font = "9px 'JetBrains Mono', monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = STREAM_CHARS[Math.floor(Math.random() * STREAM_CHARS.length)];
                ctx.fillText(text, 4, drops[i] * 11);
                if (drops[i] * 11 > height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
            rafId = requestAnimationFrame(draw);
        };

        rafId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafId);
    }, [height]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "18px", height: `${height}px`, opacity: 0.6 }}
        />
    );
}

function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sidebarHeight, setSidebarHeight] = useState(500);
    const sidebarRef = useRef(null);

    useEffect(() => {
        if (sidebarRef.current) {
            setSidebarHeight(sidebarRef.current.offsetHeight);
        }
    }, []);

    const menuItems = [
        { path: "/",         name: "Dashboard",       icon: <FaThLarge />,   color: "#3b82f6" },
        { path: "/capture",  name: "Live Capture",    icon: <FaPlay />,      color: "#10b981" },
        { path: "/packets",  name: "Packet Explorer", icon: <FaListUl />,    color: "#06b6d4" },
        { path: "/topology", name: "Network Map",     icon: <FaProjectDiagram />, color: "#38bdf8" },
        { path: "/alerts",   name: "Threat Center",   icon: <FaShieldAlt />, color: "#f43f5e" },
        { path: "/sessions", name: "Sessions",        icon: <FaDatabase />,  color: "#a78bfa" },
        { path: "/ai",       name: "AI Center",       icon: <FaRobot />,     color: "#f59e0b" },
        { path: "/settings", name: "Settings",        icon: <FaCog />,       color: "#94a3b8" },
    ];

    return (
        <aside
            ref={sidebarRef}
            className={`flex flex-col justify-between transition-all duration-300 ${isCollapsed ? "w-16" : "w-60"}`}
            style={{
                background: "rgba(7, 10, 16, 0.92)",
                borderRight: "1px solid rgba(30, 41, 59, 0.8)",
                backdropFilter: "blur(20px)",
                boxShadow: "inset -1px 0 0 rgba(59,130,246,0.08), 4px 0 24px rgba(0,0,0,0.4)",
                position: "relative",
            }}
        >
            {/* Data stream left edge */}
            {!isCollapsed && (
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden", zIndex: 0, opacity: 0.4 }}>
                    <DataStream height={sidebarHeight} />
                </div>
            )}

            <div className="flex flex-col flex-1 py-5" style={{ position: "relative", zIndex: 1 }}>
                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="self-end mr-3 mb-5 text-slate-500 hover:text-blue-400 p-1.5 rounded-md transition-all duration-200 hover:bg-blue-500/10"
                    style={{ border: "1px solid rgba(30, 41, 59, 0.6)" }}
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <FaAngleRight size={14} /> : <FaAngleLeft size={14} />}
                </button>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-2.5">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative overflow-hidden ${
                                    isActive
                                        ? "text-white"
                                        : "text-slate-500 hover:text-slate-200"
                                }`
                            }
                            style={({ isActive }) =>
                                isActive
                                    ? {
                                        background: `linear-gradient(90deg, ${item.color}22, ${item.color}08)`,
                                        border: `1px solid ${item.color}35`,
                                        boxShadow: `0 0 16px ${item.color}15, inset 0 0 12px ${item.color}08`,
                                    }
                                    : {
                                        border: "1px solid transparent",
                                    }
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active left accent bar */}
                                    {isActive && (
                                        <div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                            style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                                        />
                                    )}
                                    <span
                                        className="text-[16px] min-w-[18px] flex items-center justify-center transition-all duration-200"
                                        style={{ color: isActive ? item.color : undefined }}
                                    >
                                        {item.icon}
                                    </span>
                                    {!isCollapsed && (
                                        <span className="truncate tracking-wide">{item.name}</span>
                                    )}
                                    {/* Hover shimmer */}
                                    {!isActive && (
                                        <div
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
                                            style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.05), transparent)" }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* System status footer */}
            <div
                className="p-3 border-t"
                style={{
                    borderColor: "rgba(30, 41, 59, 0.7)",
                    background: "rgba(5, 8, 16, 0.6)",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <div className="flex items-center gap-2.5">
                    {/* Animated status dot */}
                    <div className="relative flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div
                            className="absolute inset-0 rounded-full animate-ring-scan"
                            style={{ border: "1px solid rgba(16, 185, 129, 0.5)" }}
                        />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-emerald-400 tracking-widest font-mono">
                                SYSTEM GUARD
                            </span>
                            <span className="text-[9px] text-slate-600 font-mono">
                                v1.1.0-Live · SNIFFER_ACTIVE
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
