import { FaNetworkWired } from "react-icons/fa";

function Navbar() {

    return (

        <nav className="bg-slate-800 shadow-lg">

            <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">

                <div className="flex items-center gap-3">

                    <FaNetworkWired
                        className="text-cyan-400"
                        size={28}
                    />

                    <h1 className="text-2xl font-bold text-white">

                        AI Network Traffic Analyzer

                    </h1>

                </div>

                <div>

                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">

                        ● LIVE

                    </span>

                </div>

            </div>

        </nav>

    );

}

export default Navbar;