import { useEffect, useState } from "react";
import API from "../services/api";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

function TopIPs() {

    const [ips, setIps] = useState({
        top_source_ip: "-",
        top_destination_ip: "-"
    });

    const loadIPs = async () => {

        try {

            const response = await API.get("/top-ips");

            setIps(response.data);

        }

        catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {

        loadIPs();

        const timer = setInterval(loadIPs, 2000);

        return () => clearInterval(timer);

    }, []);

    return (

        <div className="grid grid-cols-2 gap-6 mt-8">

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">

                <div className="flex items-center gap-3">

                    <FaArrowUp className="text-blue-400" />

                    <h2 className="text-xl font-bold">

                        Top Source IP

                    </h2>

                </div>

                <p className="mt-5 text-lg break-all">

                    {ips.top_source_ip}

                </p>

            </div>

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">

                <div className="flex items-center gap-3">

                    <FaArrowDown className="text-green-400" />

                    <h2 className="text-xl font-bold">

                        Top Destination IP

                    </h2>

                </div>

                <p className="mt-5 text-lg break-all">

                    {ips.top_destination_ip}

                </p>

            </div>

        </div>

    );

}

export default TopIPs;