import { useEffect, useRef, useState } from "react";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

// Animated number counter hook
function useCountUp(target, duration = 600) {
    const [display, setDisplay] = useState(target);
    const prev = useRef(target);
    const raf = useRef(null);

    useEffect(() => {
        const startVal = prev.current;
        const endVal = parseFloat(target) || 0;
        const startValNum = parseFloat(startVal) || 0;

        // If they're equal or non-numeric, just set directly
        if (startValNum === endVal || isNaN(endVal)) {
            setDisplay(target);
            prev.current = target;
            return;
        }

        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startValNum + (endVal - startValNum) * eased;

            // Format the same way as target (integer vs decimal)
            const formatted = Number.isInteger(endVal)
                ? Math.round(current).toLocaleString()
                : current.toFixed(typeof target === "string" && target.includes(".") ? target.split(".")[1].length : 1);

            setDisplay(formatted);
            if (progress < 1) {
                raf.current = requestAnimationFrame(animate);
            } else {
                setDisplay(target);
                prev.current = target;
            }
        };

        raf.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);

    return display;
}

function StatCard({ title, value, unit, icon, color = "blue", trend }) {
    const displayValue = useCountUp(value);
    const [flash, setFlash] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (value !== prevValue.current) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 400);
            prevValue.current = value;
            return () => clearTimeout(t);
        }
    }, [value]);

    const colorMap = {
        blue: {
            accent: "#3b82f6",
            iconBg: "rgba(59,130,246,0.12)",
            textClass: "text-blue-400",
            borderGlow: "rgba(59,130,246,0.3)",
            cardBg: "rgba(59,130,246,0.05)",
        },
        green: {
            accent: "#10b981",
            iconBg: "rgba(16,185,129,0.12)",
            textClass: "text-emerald-400",
            borderGlow: "rgba(16,185,129,0.3)",
            cardBg: "rgba(16,185,129,0.05)",
        },
        red: {
            accent: "#f43f5e",
            iconBg: "rgba(244,63,94,0.12)",
            textClass: "text-rose-400",
            borderGlow: "rgba(244,63,94,0.3)",
            cardBg: "rgba(244,63,94,0.05)",
        },
        yellow: {
            accent: "#f59e0b",
            iconBg: "rgba(245,158,11,0.12)",
            textClass: "text-amber-400",
            borderGlow: "rgba(245,158,11,0.3)",
            cardBg: "rgba(245,158,11,0.05)",
        },
        purple: {
            accent: "#a78bfa",
            iconBg: "rgba(167,139,250,0.12)",
            textClass: "text-violet-400",
            borderGlow: "rgba(167,139,250,0.3)",
            cardBg: "rgba(167,139,250,0.05)",
        },
    };

    const c = colorMap[color] || colorMap.blue;

    return (
        <div
            className="rounded-xl p-5 flex items-center justify-between transition-all duration-300 group cursor-default relative overflow-hidden"
            style={{
                background: `linear-gradient(135deg, rgba(11,15,26,0.9), ${c.cardBg})`,
                border: `1px solid ${flash ? c.accent + "60" : c.accent + "25"}`,
                boxShadow: flash
                    ? `0 0 24px ${c.borderGlow}, 0 4px 20px rgba(0,0,0,0.4)`
                    : `0 0 12px rgba(0,0,0,0.3)`,
                transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 32px ${c.borderGlow}, 0 8px 32px rgba(0,0,0,0.5)`;
                e.currentTarget.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 12px rgba(0,0,0,0.3)";
                e.currentTarget.style.transform = "translateY(0)";
            }}
        >
            {/* Background corner accent */}
            <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-8 translate-x-8"
                style={{ background: `radial-gradient(circle, ${c.accent}, transparent 70%)` }}
            />

            {/* Left: text content */}
            <div className="flex-1 min-w-0 relative z-10">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                    {title}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                    <span
                        className={`text-2xl md:text-3xl font-extrabold font-mono tracking-tight ${flash ? "text-white" : "text-slate-100"}`}
                        style={{
                            transition: "color 0.3s",
                            textShadow: flash ? `0 0 12px ${c.accent}` : "none",
                        }}
                    >
                        {displayValue}
                    </span>
                    {unit && (
                        <span className={`text-[11px] font-semibold font-mono ${c.textClass}`}>
                            {unit}
                        </span>
                    )}
                </div>
                {trend && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-slate-500">
                        {trend.type === "up" ? (
                            <FaArrowUp className="text-emerald-400" />
                        ) : (
                            <FaArrowDown className="text-rose-400" />
                        )}
                        <span className={trend.type === "up" ? "text-emerald-400" : "text-rose-400"}>
                            {trend.value}
                        </span>
                        <span className="text-slate-600">{trend.label}</span>
                    </div>
                )}
            </div>

            {/* Right: icon */}
            {icon && (
                <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-xl shrink-0 relative z-10 transition-all duration-300 group-hover:scale-110"
                    style={{
                        background: c.iconBg,
                        border: `1px solid ${c.accent}25`,
                        boxShadow: `0 0 16px ${c.accent}20`,
                    }}
                >
                    {icon}
                </div>
            )}

            {/* Bottom animated line */}
            <div
                className="absolute bottom-0 left-0 h-[2px] transition-all duration-300 group-hover:w-full"
                style={{
                    width: flash ? "100%" : "30%",
                    background: `linear-gradient(90deg, ${c.accent}, transparent)`,
                    opacity: 0.6,
                }}
            />
        </div>
    );
}

export default StatCard;