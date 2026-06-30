import { FaSpinner } from "react-icons/fa";

function Loader({ message = "Loading system telemetry..." }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-[#111726]/40 border border-[#1e293b]/50 rounded-xl">
            <FaSpinner className="animate-spin text-blue-500 text-3xl" />
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest font-mono">
                {message}
            </span>
        </div>
    );
}

export default Loader;
