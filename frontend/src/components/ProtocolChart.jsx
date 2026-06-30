import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { FaChartPie } from "react-icons/fa";
import API from "../services/api";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

function ProtocolChart() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadProtocols = async () => {
        try {
            const response = await API.get("/protocols");
            if (response.data) {
                const chartData = Object.entries(response.data)
                    .filter(([, v]) => v.count > 0)
                    .map(([name, value]) => ({ name, value: value.count }));
                setData(chartData);
                setError(false);
            }
        } catch (err) {
            console.error("Protocol Fetch Error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProtocols();
        const timer = setInterval(loadProtocols, 6000);
        return () => clearInterval(timer);
    }, []);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0b0f19] border border-[#1e293b] p-3 rounded-lg shadow-xl text-xs font-mono">
                    <p className="text-white font-bold">{payload[0].name}: {payload[0].value.toLocaleString()} packets</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-[#1e293b]/40 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <FaChartPie />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Protocol Breakdown</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Distribution Map</p>
                    </div>
                </div>
            </div>

            <div className="h-[280px]">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 animate-pulse">
                        <div className="h-32 w-32 bg-slate-800 rounded-full" />
                        <div className="h-2 bg-slate-800 rounded w-48" />
                    </div>
                ) : error ? (
                    <div className="h-full flex items-center justify-center text-xs text-rose-400 gap-2">
                        Unable to load protocol data.
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        Awaiting network stream...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={85}
                                innerRadius={45}
                                paddingAngle={2}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index % COLORS.length]}
                                        stroke="#111726"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                iconType="circle"
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "15px" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export default ProtocolChart;