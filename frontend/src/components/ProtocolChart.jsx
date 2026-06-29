import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import API from "../services/api";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

function ProtocolChart() {

    const [data, setData] = useState([]);

    const loadProtocols = async () => {

        try {

            const response = await API.get("/protocols");

            const chartData = Object.entries(response.data).map(([name, value]) => ({
                name,
                value: value.count
            }));

            setData(chartData);

        } catch (error) {
            console.log(error);
        }

    };

    useEffect(() => {

        loadProtocols();

        const timer = setInterval(loadProtocols, 2000);

        return () => clearInterval(timer);

    }, []);

    return (

        <div className="bg-slate-800 rounded-xl p-5 shadow-lg">

            <h2 className="text-xl font-bold text-white mb-5">
                Protocol Distribution
            </h2>

            <ResponsiveContainer width="100%" height={350}>

                <PieChart>

                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={120}
                        label
                    >

                        {
                            data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={COLORS[index % COLORS.length]}
                                />
                            ))
                        }

                    </Pie>

                    <Tooltip />

                    <Legend />

                </PieChart>

            </ResponsiveContainer>

        </div>

    );

}

export default ProtocolChart;