import { FaFileCsv, FaFileDownload } from "react-icons/fa";

function ExportButtons() {
    const API_BASE = "http://127.0.0.1:5000";

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <h2 className="text-md font-bold text-white">Data Export Centre</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Download capture archives</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Export CSV Button */}
                <a
                    href={`${API_BASE}/export/csv`}
                    download
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-xs px-4 py-2.5 rounded-lg transition font-semibold"
                >
                    <FaFileCsv className="text-emerald-400 text-base" />
                    <span>EXPORT SESSION CSV</span>
                </a>

                {/* Export PCAP Button */}
                <a
                    href={`${API_BASE}/export/pcap`}
                    download
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs px-4 py-2.5 rounded-lg transition font-semibold shadow-lg shadow-blue-500/10"
                >
                    <FaFileDownload className="text-base" />
                    <span>EXPORT RAW PCAP</span>
                </a>
            </div>
        </div>
    );
}

export default ExportButtons;
