import { FaArrowUp } from "react-icons/fa";

function StatCard({ title, value, unit }) {

    return (

        <div className="bg-slate-800 rounded-xl shadow-lg p-6 hover:bg-slate-700 transition">

            <h3 className="text-gray-400 text-sm">

                {title}

            </h3>

            <div className="flex items-center justify-between mt-3">

                <h1 className="text-3xl font-bold text-white">

                    {value}

                </h1>

                <FaArrowUp className="text-green-400 text-2xl" />

            </div>

            <p className="text-gray-500 mt-3">

                {unit}

            </p>

        </div>

    )

}

export default StatCard;