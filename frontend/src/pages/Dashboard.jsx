import { useEffect, useState } from "react";

import API from "../services/api";

import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import ProtocolChart from "../components/ProtocolChart";
import TopIPs from "../components/TopIPs";
import TopPorts from "../components/TopPorts";

function Dashboard() {

    const [metrics, setMetrics] = useState({

        total_packets: 0,

        packet_rate: 0,

        bandwidth: 0,

        average_packet_size: 0

    });

    const loadMetrics = async () => {

        try {

            const response = await API.get("/metrics");

            setMetrics(response.data);

        }

        catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {

        loadMetrics();

        const timer = setInterval(loadMetrics, 2000);

        return () => clearInterval(timer);

    }, []);

    return (

        <div className="min-h-screen bg-slate-900 text-white">

            <Navbar />

            <div className="max-w-7xl mx-auto p-8">

                <div className="grid grid-cols-4 gap-6">

                    <StatCard
                        title="Total Packets"
                        value={metrics.total_packets}
                        unit="Packets"
                    />

                    <StatCard
                        title="Packet Rate"
                        value={metrics.packet_rate}
                        unit="Packets/sec"
                    />

                    <StatCard
                        title="Bandwidth"
                        value={metrics.bandwidth}
                        unit="Bytes/sec"
                    />

                    <StatCard
                        title="Average Packet Size"
                        value={metrics.average_packet_size}
                        unit="Bytes"
                    />

                </div>

                <div className="mt-10">

                    <ProtocolChart />

                </div>

                <TopIPs />

                <TopPorts />

            </div>

        </div>

    );

}

export default Dashboard;