import { useEffect, useState } from "react";
import API from "../services/api";
import { FaPlug } from "react-icons/fa";

function TopPorts() {

    const [ports, setPorts] = useState({

        top_source_port: "-",

        top_destination_port: "-"

    });

    const loadPorts = async () => {

        try {

            const response = await API.get("/ports");

            setPorts(response.data);

        }

        catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {

        loadPorts();

        const timer = setInterval(loadPorts, 2000);

        return () => clearInterval(timer);

    }, []);

    return (

        <div className="grid grid-cols-2 gap-6 mt-8">

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">

                <div className="flex items-center gap-3">

                    <FaPlug className="text-yellow-400" />

                    <h2 className="text-xl font-bold">

                        Top Source Port

                    </h2>

                </div>

                <p className="text-4xl mt-5 font-bold">

                    {ports.top_source_port}

                </p>

            </div>

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">

                <div className="flex items-center gap-3">

                    <FaPlug className="text-red-400" />

                    <h2 className="text-xl font-bold">

                        Top Destination Port

                    </h2>

                </div>

                <p className="text-4xl mt-5 font-bold">

                    {ports.top_destination_port}

                </p>

            </div>

        </div>

    );

}

export default TopPorts;