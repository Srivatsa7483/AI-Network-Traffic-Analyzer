import { useEffect, useState } from "react";
import API from "../services/api";

function RecentPackets() {

    const [packets, setPackets] = useState([]);

    async function loadPackets() {

        try {

            const response = await API.get("/recent-packets");

            setPackets(response.data);

        }

        catch (err) {

            console.log(err);

        }

    }

    useEffect(() => {

        loadPackets();

        const timer = setInterval(loadPackets, 2000);

        return () => clearInterval(timer);

    }, []);

    return (

        <div className="bg-slate-800 rounded-xl mt-10 p-6">

            <h2 className="text-2xl font-bold mb-5">

                Recent Packets

            </h2>

            <table className="w-full">

                <thead>

                    <tr>

                        <th>Time</th>

                        <th>Source</th>

                        <th>Destination</th>

                        <th>Protocol</th>

                        <th>Src Port</th>

                        <th>Dst Port</th>

                        <th>Size</th>

                    </tr>

                </thead>

                <tbody>

                    {

                        packets.map((packet, index) => (

                            <tr key={index} className="border-t border-slate-700">

                                <td>{packet.timestamp}</td>

                                <td>{packet.source_ip}</td>

                                <td>{packet.destination_ip}</td>

                                <td>{packet.protocol}</td>

                                <td>{packet.source_port}</td>

                                <td>{packet.destination_port}</td>

                                <td>{packet.packet_size}</td>

                            </tr>

                        ))

                    }

                </tbody>

            </table>

        </div>

    )

}

export default RecentPackets;