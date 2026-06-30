import { useState, useEffect } from "react";
import { FaTimes, FaLayerGroup, FaChevronDown, FaChevronRight, FaCode } from "react-icons/fa";
import API from "../services/api";
import Loader from "./Loader";

function PacketDetailsDrawer({ packetId, isOpen, onClose }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [openLayers, setOpenLayers] = useState({});

    useEffect(() => {
        if (!packetId || !isOpen) return;

        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await API.get(`/packets/${packetId}/detail`);
                if (res.data) {
                    setDetails(res.data);
                    // Open all layers by default
                    const initialOpen = {};
                    if (res.data.layers) {
                        Object.keys(res.data.layers).forEach((layer) => {
                            initialOpen[layer] = true;
                        });
                    }
                    setOpenLayers(initialOpen);
                }
            } catch (err) {
                console.error("Fetch Details Error:", err);
                setError(err.response?.data?.error || "Failed to load packet details.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [packetId, isOpen]);

    if (!isOpen) return null;

    const toggleLayer = (layerName) => {
        setOpenLayers((prev) => ({
            ...prev,
            [layerName]: !prev[layerName]
        }));
    };

    return (
        <div className={`fixed inset-y-0 right-0 w-full md:w-[480px] lg:w-[580px] bg-[#0b0f19] border-l border-[#1e293b] shadow-2xl z-50 flex flex-col transition duration-300 ${
            isOpen ? "translate-x-0" : "translate-x-full"
        }`}>
            {/* Header */}
            <div className="p-4 border-b border-[#1e293b] bg-[#0e1320] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <FaLayerGroup />
                    </div>
                    <div>
                        <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                            Packet Inspector
                        </h2>
                        <span className="text-[9px] text-slate-500 font-mono">
                            FRAME #{packetId}
                        </span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg hover:bg-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                    <FaTimes />
                </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                {loading ? (
                    <div className="py-20">
                        <Loader message="Decoding Scapy frames..." />
                    </div>
                ) : error ? (
                    <div className="p-5 text-center bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                        {error}
                    </div>
                ) : details ? (
                    <>
                        {/* Frame Overview Summary */}
                        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-4 space-y-2 text-xs font-mono">
                            <div className="flex justify-between py-1 border-b border-[#1e293b]/40">
                                <span className="text-slate-500">Capture Time</span>
                                <span className="text-slate-200">{details.summary.time}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#1e293b]/40">
                                <span className="text-slate-500">Frame Size</span>
                                <span className="text-blue-400 font-bold">{details.summary.size} bytes</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Highest Protocol</span>
                                <span className="text-indigo-400 font-bold">{details.summary.protocol}</span>
                            </div>
                        </div>

                        {/* Layer accordions */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                Decoded Layer Telemetry
                            </h3>
                            
                            {Object.entries(details.layers).map(([layerName, fields]) => {
                                const isLayerOpen = !!openLayers[layerName];

                                return (
                                    <div key={layerName} className="bg-[#111726] border border-[#1e293b] rounded-lg overflow-hidden">
                                        {/* Toggle Header */}
                                        <button
                                            onClick={() => toggleLayer(layerName)}
                                            className="w-full px-4 py-3 bg-[#161f30]/40 flex items-center justify-between text-xs font-bold text-white tracking-wider border-b border-[#1e293b]/20 hover:bg-[#161f30]/80 transition"
                                        >
                                            <span className="font-mono">{layerName} Layer</span>
                                            {isLayerOpen ? <FaChevronDown className="text-slate-400 text-[10px]" /> : <FaChevronRight className="text-slate-400 text-[10px]" />}
                                        </button>

                                        {/* Fields List */}
                                        {isLayerOpen && (
                                            <div className="p-4 space-y-2.5 bg-[#0b0f19]/25 text-[11px] font-mono select-all">
                                                {Object.entries(fields).length === 0 ? (
                                                    <span className="text-slate-500 block">No fields mapped for this layer.</span>
                                                ) : (
                                                    Object.entries(fields).map(([k, v]) => (
                                                        <div key={k} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-0.5 border-b border-[#1e293b]/10">
                                                            <span className="text-slate-400 font-semibold">{k}</span>
                                                            <span className="text-white break-all max-w-xs">{v}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Monospace Raw Payload Hex Dump */}
                        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider border-b border-[#1e293b]/40 pb-2">
                                <FaCode className="text-blue-400" />
                                <span>Payload Hex Dump (Wireshark Translation)</span>
                            </div>

                            <pre className="overflow-x-auto text-[10px] font-mono leading-relaxed bg-[#070a10] border border-[#1e293b]/50 p-3 rounded-lg text-slate-300 scrollbar-thin select-all">
                                {details.payload.hex || "No payload segment captured."}
                            </pre>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-xs text-slate-500 py-10">
                        Frame details expired.
                    </div>
                )}
            </div>
        </div>
    );
}

export default PacketDetailsDrawer;
