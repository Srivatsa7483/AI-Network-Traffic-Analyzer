import { useState } from "react";
import { FaSearch, FaFilter, FaArrowDown, FaArrowUp, FaRegFileCode } from "react-icons/fa";
import { useLiveData } from "../hooks/useLiveData";
import Loader from "./Loader";
import PacketDetailsDrawer from "./PacketDetailsDrawer";

function RecentPackets({ packets: propPackets = null, limit = null }) {
    const [search, setSearch] = useState("");
    const [filterProto, setFilterProto] = useState("ALL");
    const [wiresharkQuery, setWiresharkQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("");
    const [selectedPacketId, setSelectedPacketId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Virtual scroll state
    const [isVirtualScroll, setIsVirtualScroll] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = limit || 18;

    // Fetch live packets if not passed as a prop, dynamically including active Wireshark filter query
    const { data: livePackets, loading } = propPackets 
        ? { data: null, loading: false } 
        : useLiveData(
            activeFilter ? `/recent-packets?filter=${encodeURIComponent(activeFilter)}` : "/recent-packets", 
            1500
          );

    const packetsList = propPackets || livePackets || [];

    if (!propPackets && loading && packetsList.length === 0) {
        return <Loader message="Listening on default interface for live telemetry..." />;
    }

    // Client-side quick filter logic (for text search and protocol dropdown)
    const filteredPackets = packetsList.filter((pkt) => {
        const query = search.toLowerCase();
        
        // Search inside ports, IPs, flags, and info column summaries
        const matchesSearch = 
            pkt.source_ip.toLowerCase().includes(query) ||
            pkt.destination_ip.toLowerCase().includes(query) ||
            (pkt.source_port && pkt.source_port.toString().includes(query)) ||
            (pkt.destination_port && pkt.destination_port.toString().includes(query)) ||
            (pkt.flags && pkt.flags.toLowerCase().includes(query)) ||
            (pkt.info && pkt.info.toLowerCase().includes(query));

        // Protocol matching
        let matchesProto = true;
        if (filterProto !== "ALL") {
            if (filterProto === "DNS") {
                matchesProto = pkt.info && pkt.info.toLowerCase().includes("dns");
            } else if (filterProto === "HTTP") {
                matchesProto = pkt.info && pkt.info.toLowerCase().includes("http");
            } else {
                matchesProto = pkt.protocol === filterProto;
            }
        }

        return matchesSearch && matchesProto;
    });

    // Pagination
    const totalPages = Math.ceil(filteredPackets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPackets = limit 
        ? filteredPackets.slice(0, limit)
        : filteredPackets.slice(startIndex, startIndex + itemsPerPage);

    // List Virtualization window calculations
    const containerHeight = 450;
    const rowHeight = 32;
    const virtualStartIndex = isVirtualScroll 
        ? Math.max(0, Math.floor(scrollTop / rowHeight) - 3)
        : 0;
    const virtualEndIndex = isVirtualScroll
        ? Math.min(filteredPackets.length - 1, Math.floor((scrollTop + containerHeight) / rowHeight) + 3)
        : filteredPackets.length - 1;

    const visiblePackets = isVirtualScroll
        ? filteredPackets.slice(virtualStartIndex, virtualEndIndex + 1)
        : paginatedPackets;

    const handleRowClick = (pktId, e) => {
        setSelectedPacketId(pktId);
        setIsDrawerOpen(true);
    };

    // Client-side quick checks for syntax highlight while typing Wireshark query
    const isValidWiresharkFilter = (query) => {
        if (!query) return true;
        const trimmed = query.trim();
        if (
            trimmed.endsWith("==") || 
            trimmed.endsWith("!=") || 
            trimmed.endsWith(">") || 
            trimmed.endsWith("<") || 
            trimmed.endsWith("and") || 
            trimmed.endsWith("or") || 
            trimmed.endsWith("&&") || 
            trimmed.endsWith("||") || 
            trimmed.endsWith("!")
        ) {
            return false;
        }
        if (/\b(ip\.src|ip\.dst|port|length|len)\b/i.test(trimmed)) {
            if (!/(==|!=|>|<|>=|<=)/.test(trimmed)) {
                return false;
            }
        }
        return true;
    };

    // Full Wireshark row color rendering based on protocol or alerts
    const getRowBgClass = (proto, info = "", isSelected) => {
        if (isSelected) return "bg-[#1d2a42] text-white border-l-2 border-blue-500";
        const infoLower = (info || "").toLowerCase();
        
        if (
            infoLower.includes("alert") || 
            infoLower.includes("anomaly") || 
            infoLower.includes("threat") || 
            infoLower.includes("scan") || 
            infoLower.includes("flood")
        ) {
            return "bg-[#3f1622]/35 text-rose-200 border-l border-rose-500/40 hover:bg-[#3f1622]/55";
        }
        
        if (infoLower.includes("dns")) return "bg-[#251b3b]/35 text-purple-200 hover:bg-[#251b3b]/55";
        if (infoLower.includes("http") || infoLower.includes("http/")) return "bg-[#3d1931]/35 text-pink-200 hover:bg-[#3d1931]/55";
        if (infoLower.includes("tls") || infoLower.includes("ssl") || infoLower.includes("client hello")) {
            return "bg-[#1a233d]/35 text-indigo-200 hover:bg-[#1a233d]/55";
        }
        
        if (proto === "TCP") return "bg-[#16233b]/35 text-blue-200 hover:bg-[#16233b]/55";
        if (proto === "UDP") return "bg-[#132d24]/35 text-emerald-200 hover:bg-[#132d24]/55";
        if (proto === "ICMP") return "bg-[#2e2116]/35 text-amber-200 hover:bg-[#2e2116]/55";
        return "bg-[#161f30]/20 text-slate-300 hover:bg-[#161f30]/40";
    };

    const getProtoStyles = (proto, info = "") => {
        const infoLower = (info || "").toLowerCase();
        if (infoLower.includes("dns")) return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
        if (infoLower.includes("http")) return "bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold";
        if (infoLower.includes("tls") || infoLower.includes("client hello")) return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
        
        if (proto === "TCP") return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        if (proto === "UDP") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        if (proto === "ICMP") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
        return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    };

    return (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
            {/* Header tools */}
            <div className="p-4 border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e1320]">
                <div>
                    <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        {limit ? "Recent Captured Logs" : "Wireshark Packet Stream"}
                    </h2>
                    <p className="text-[9px] text-slate-500 font-mono tracking-wide uppercase mt-0.5">
                        Live Socket Telemetry Feed
                    </p>
                </div>

                {!limit && (
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Wireshark syntax filter input */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                setActiveFilter(wiresharkQuery);
                                setCurrentPage(1);
                            }}
                            className="flex items-center gap-1.5"
                        >
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-[10px] font-mono select-none">
                                    filter:
                                </span>
                                <input
                                    type="text"
                                    placeholder="e.g. tcp and port == 443"
                                    value={wiresharkQuery}
                                    onChange={(e) => setWiresharkQuery(e.target.value)}
                                    className={`bg-[#161f30] border ${
                                        wiresharkQuery && !isValidWiresharkFilter(wiresharkQuery)
                                            ? "border-rose-500/50 focus:border-rose-500 focus:bg-rose-950/10" 
                                            : wiresharkQuery 
                                            ? "border-emerald-500/50 focus:border-emerald-500 focus:bg-emerald-950/10" 
                                            : "border-[#1e293b] focus:border-blue-500"
                                    } outline-none text-slate-200 text-xs rounded-lg pl-14 pr-8 py-1.5 w-64 transition font-mono`}
                                />
                                {wiresharkQuery && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setWiresharkQuery("");
                                            setActiveFilter("");
                                            setCurrentPage(1);
                                        }}
                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition text-sm"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="bg-[#1e293b] hover:bg-[#2e3e56] border border-[#334155] text-slate-200 font-bold text-xs px-2.5 py-1.5 rounded-lg transition"
                            >
                                Apply
                            </button>
                        </form>

                        {/* Search */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
                                <FaSearch />
                            </span>
                            <input
                                type="text"
                                placeholder="Quick search..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-[#161f30] border border-[#1e293b] focus:border-blue-500 outline-none text-slate-200 text-xs rounded-lg pl-9 pr-4 py-1.5 w-40 transition font-medium"
                            />
                        </div>

                        {/* Filter */}
                        <div className="relative flex items-center bg-[#161f30] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                            <FaFilter className="text-slate-500 mr-2 text-[10px]" />
                            <select
                                value={filterProto}
                                onChange={(e) => {
                                    setFilterProto(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-transparent outline-none border-none text-slate-300 font-semibold cursor-pointer"
                            >
                                <option value="ALL">ALL PROTOCOLS</option>
                                <option value="TCP">TCP</option>
                                <option value="UDP">UDP</option>
                                <option value="ICMP">ICMP</option>
                                <option value="DNS">DNS</option>
                                <option value="HTTP">HTTP</option>
                            </select>
                        </div>

                        {/* Virtual Scroll Toggle */}
                        {!limit && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsVirtualScroll(!isVirtualScroll);
                                    setCurrentPage(1);
                                    setScrollTop(0);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition duration-150 cursor-pointer ${
                                    isVirtualScroll 
                                        ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-400" 
                                        : "bg-[#161f30] border-[#1e293b] text-slate-400 hover:text-slate-200"
                                }`}
                                title="Toggle virtual windowed rendering for high packet flows"
                            >
                                ⚡ {isVirtualScroll ? "VIRTUAL SCROLL" : "PAGINATED"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div 
                onScroll={isVirtualScroll ? (e) => setScrollTop(e.target.scrollTop) : undefined}
                className={`overflow-x-auto flex-1 ${isVirtualScroll ? "overflow-y-auto max-h-[450px]" : ""}`}
            >
                <table className="w-full text-left border-collapse text-[11px] font-mono whitespace-nowrap">
                    <thead>
                        <tr className="bg-[#0e1320] text-slate-400 font-bold border-b border-[#1e293b] uppercase tracking-wide text-[10px]">
                            <th className="py-2.5 px-4 w-12 text-center">No</th>
                            <th className="py-2.5 px-4 w-24">Time</th>
                            <th className="py-2.5 px-4 w-40">Source IP</th>
                            <th className="py-2.5 px-4 w-40">Destination IP</th>
                            <th className="py-2.5 px-4 w-20 text-center">Protocol</th>
                            <th className="py-2.5 px-4 w-20 text-right">Src Port</th>
                            <th className="py-2.5 px-4 w-20 text-right">Dst Port</th>
                            <th className="py-2.5 px-4 w-20 text-right">Length</th>
                            <th className="py-2.5 px-4 w-16 text-center">Flags</th>
                            <th className="py-2.5 px-4">Info Summary</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]/50">
                        {visiblePackets.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="py-12 text-center text-slate-500 font-semibold">
                                    No packets matching criteria captured.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {isVirtualScroll && virtualStartIndex > 0 && (
                                    <tr style={{ height: `${virtualStartIndex * rowHeight}px` }}>
                                        <td colSpan="10" className="p-0"></td>
                                    </tr>
                                )}
                                {visiblePackets.map((pkt) => {
                                    const isSelected = selectedPacketId === pkt.id;
                                    const rowBg = getRowBgClass(pkt.protocol, pkt.info, isSelected);
                                    const protoClass = getProtoStyles(pkt.protocol, pkt.info);

                                    return (
                                        <tr 
                                            key={pkt.id} 
                                            onClick={(e) => handleRowClick(pkt.id, e)}
                                            className={`transition duration-100 cursor-pointer h-[32px] ${rowBg}`}
                                        >
                                            <td className="py-2 px-4 text-center text-slate-500 font-bold">
                                                {pkt.id}
                                            </td>
                                            <td className="py-2 px-4 text-slate-400">
                                                {pkt.timestamp}
                                            </td>
                                            <td className="py-2 px-4 text-slate-200 font-semibold truncate max-w-[150px]">
                                                {pkt.source_ip}
                                            </td>
                                            <td className="py-2 px-4 text-slate-200 font-semibold truncate max-w-[150px]">
                                                {pkt.destination_ip}
                                            </td>
                                            <td className="py-2 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${protoClass}`}>
                                                    {pkt.protocol}
                                                </span>
                                            </td>
                                            <td className="py-2 px-4 text-right text-slate-300">
                                                {pkt.source_port !== null && pkt.source_port !== undefined ? pkt.source_port : "-"}
                                            </td>
                                            <td className="py-2 px-4 text-right text-slate-300">
                                                {pkt.destination_port !== null && pkt.destination_port !== undefined ? pkt.destination_port : "-"}
                                            </td>
                                            <td className="py-2 px-4 text-right text-blue-400 font-bold">
                                                {pkt.packet_size}
                                            </td>
                                            <td className="py-2 px-4 text-center font-bold text-slate-400">
                                                {pkt.flags || "-"}
                                            </td>
                                            <td className="py-2 px-4 text-slate-300 truncate max-w-sm" title={pkt.info}>
                                                {pkt.info || "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {isVirtualScroll && virtualEndIndex < filteredPackets.length - 1 && (
                                    <tr style={{ height: `${(filteredPackets.length - virtualEndIndex - 1) * rowHeight}px` }}>
                                        <td colSpan="10" className="p-0"></td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Pagination */}
            {!limit && !isVirtualScroll && totalPages > 1 && (
                <div className="bg-[#0e1320] border-t border-[#1e293b] p-3.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                        Showing <strong className="text-slate-300 font-semibold">{startIndex + 1}</strong> to{" "}
                        <strong className="text-slate-300 font-semibold">
                            {Math.min(startIndex + itemsPerPage, filteredPackets.length)}
                        </strong>{" "}
                        of <strong className="text-slate-300 font-semibold">{filteredPackets.length}</strong> frames
                    </span>

                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((c) => c - 1)}
                            className="bg-[#161f30] hover:bg-[#1d2a42] disabled:opacity-30 border border-[#1e293b] text-slate-300 px-3 py-1 rounded transition text-[10px] font-bold"
                        >
                            PREV
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((c) => c + 1)}
                            className="bg-[#161f30] hover:bg-[#1d2a42] disabled:opacity-30 border border-[#1e293b] text-slate-300 px-3 py-1 rounded transition text-[10px] font-bold"
                        >
                            NEXT
                        </button>
                    </div>
                </div>
            )}

            {/* Structured Wireshark Details Drawer Overlay */}
            <PacketDetailsDrawer
                packetId={selectedPacketId}
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedPacketId(null);
                }}
            />
        </div>
    );
}

export default RecentPackets;