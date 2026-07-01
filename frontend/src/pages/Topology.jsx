import { useEffect, useState, useRef } from "react";
import { FaProjectDiagram, FaGlobe, FaSync, FaInfoCircle, FaDesktop, FaHdd, FaCloud, FaChartBar } from "react-icons/fa";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";
import API from "../services/api";

function Topology() {
    const [activeTab, setActiveTab] = useState("topology"); // "topology" | "geoip" | "analytics"
    const [packets, setPackets] = useState([]);
    const [geoLocations, setGeoLocations] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const canvasRef = useRef(null);
    const geoCanvasRef = useRef(null);

    // Calculate analytics dynamically from recent packets
    const getPacketSizeDistribution = () => {
        let tiny = 0, small = 0, medium = 0, large = 0, jumbo = 0;
        packets.forEach(p => {
            const sz = p.packet_size || 0;
            if (sz < 64) tiny++;
            else if (sz <= 511) small++;
            else if (sz <= 1023) medium++;
            else if (sz <= 1500) large++;
            else jumbo++;
        });
        return [
            { range: "< 64 B", count: tiny, fill: "#38bdf8" },
            { range: "64-511 B", count: small, fill: "#3b82f6" },
            { range: "512-1023 B", count: medium, fill: "#a78bfa" },
            { range: "1024-1500 B", count: large, fill: "#10b981" },
            { range: "> 1500 B", count: jumbo, fill: "#f59e0b" }
        ];
    };

    const getProtocolDistribution = () => {
        const counts = {};
        packets.forEach(p => {
            const proto = p.protocol || "OTHER";
            counts[proto] = (counts[proto] || 0) + 1;
        });
        const colors = {
            TCP: "#3b82f6",
            UDP: "#10b981",
            DNS: "#a78bfa",
            ICMP: "#f59e0b",
            HTTP: "#ec4899",
            HTTPS: "#f43f5e"
        };
        return Object.keys(counts).map(k => ({
            name: k,
            value: counts[k],
            fill: colors[k] || "#94a3b8"
        }));
    };

    const getActiveFlows = () => {
        const flows = {};
        packets.forEach(p => {
            if (p.source_ip && p.destination_ip) {
                const key = `${p.source_ip} -> ${p.destination_ip} (${p.protocol})`;
                if (!flows[key]) {
                    flows[key] = {
                        source: p.source_ip,
                        target: p.destination_ip,
                        protocol: p.protocol,
                        packetsCount: 0,
                        bytesCount: 0
                    };
                }
                flows[key].packetsCount += 1;
                flows[key].bytesCount += (p.packet_size || 0);
            }
        });
        return Object.values(flows).sort((a, b) => b.packetsCount - a.packetsCount).slice(0, 8);
    };

    // Dynamic state for force-directed graph simulation
    const simulationRef = useRef({
        nodes: [],
        links: [],
        particles: []
    });

    const fetchData = async () => {
        try {
            const [packetsRes, geoRes] = await Promise.all([
                API.get("/recent-packets?limit=100"),
                API.get("/geoip/locations")
            ]);
            
            if (packetsRes.data) setPackets(packetsRes.data);
            if (geoRes.data) setGeoLocations(geoRes.data);
            
            syncSimulation(packetsRes.data, geoRes.data);
        } catch (error) {
            console.error("Failed to load topology visualization data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to check if IP is private
    const isPrivateIP = (ip) => {
        if (!ip) return true;
        if (ip === "127.0.0.1" || ip === "localhost") return true;
        const parts = ip.split(".");
        if (parts.length < 4) return true;
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);
        return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
    };

    // Categorize endpoints for rich labels
    const getIPLabel = (ip, geoInfo) => {
        if (isPrivateIP(ip)) {
            if (ip.endsWith(".1")) return "Default Gateway Router";
            if (ip === "127.0.0.1") return "Local Host (Loopback)";
            return `Internal Host (${ip})`;
        }
        if (geoInfo && geoInfo[ip]) {
            const org = geoInfo[ip].org || "";
            if (org.toLowerCase().includes("google")) return `Google Cloud Server`;
            if (org.toLowerCase().includes("cloudflare")) return `Cloudflare CDN`;
            if (org.toLowerCase().includes("amazon") || org.toLowerCase().includes("aws")) return `Amazon AWS Host`;
            if (org.toLowerCase().includes("microsoft") || org.toLowerCase().includes("azure")) return `Microsoft Azure Node`;
            return `${org} (${geoInfo[ip].city}, ${geoInfo[ip].country})`;
        }
        return `External Endpoint (${ip})`;
    };

    const syncSimulation = (packetList, geoInfo) => {
        const sim = simulationRef.current;
        const width = 800;
        const height = 450;

        // Build unique node set from packet streams
        const nodeMap = new Map();
        
        // Always ensure Local Terminal & Router exist
        nodeMap.set("192.168.1.100", {
            id: "192.168.1.100",
            label: "Operator Terminal (You)",
            type: "local",
            x: width / 4,
            y: height / 2,
            vx: 0,
            vy: 0,
            size: 16
        });
        
        nodeMap.set("192.168.1.1", {
            id: "192.168.1.1",
            label: "Default Gateway Router",
            type: "gateway",
            x: width / 2.2,
            y: height / 2,
            vx: 0,
            vy: 0,
            size: 14
        });

        // Add nodes seen in recent packets
        packetList.forEach(p => {
            const src = p.source_ip;
            const dst = p.destination_ip;
            
            [src, dst].forEach(ip => {
                if (ip && !nodeMap.has(ip)) {
                    const isPri = isPrivateIP(ip);
                    nodeMap.set(ip, {
                        id: ip,
                        label: getIPLabel(ip, geoInfo),
                        type: isPri ? (ip.endsWith(".1") ? "gateway" : "local") : "external",
                        x: width / 2 + (Math.random() - 0.5) * 300,
                        y: height / 2 + (Math.random() - 0.5) * 300,
                        vx: 0,
                        vy: 0,
                        size: isPri ? 10 : 12
                    });
                }
            });
        });

        // Retain positions of existing nodes if already present
        const newNodes = Array.from(nodeMap.values()).map(n => {
            const existing = sim.nodes.find(old => old.id === n.id);
            if (existing) {
                n.x = existing.x;
                n.y = existing.y;
                n.vx = existing.vx;
                n.vy = existing.vy;
            }
            return n;
        });

        // Build unique links
        const linkMap = new Map();
        
        // Ensure local hosts are connected to Default Gateway Router
        newNodes.forEach(n => {
            if (n.type === "local" && n.id !== "192.168.1.1") {
                const linkId = `192.168.1.1-to-${n.id}`;
                linkMap.set(linkId, {
                    source: "192.168.1.1",
                    target: n.id,
                    weight: 1
                });
            }
        });

        // Add links from observed packet flows
        packetList.forEach(p => {
            const src = p.source_ip;
            const dst = p.destination_ip;
            
            if (src && dst) {
                // If it is external communication, route it through Gateway
                let sourceNode = src;
                let targetNode = dst;
                
                const srcExternal = !isPrivateIP(src);
                const dstExternal = !isPrivateIP(dst);
                
                if (srcExternal && dstExternal) {
                    // Both external
                } else if (srcExternal) {
                    // Src external -> Gateway -> Dest local
                    const linkId1 = `${src}-to-192.168.1.1`;
                    linkMap.set(linkId1, { source: src, target: "192.168.1.1", weight: 1.5 });
                    sourceNode = "192.168.1.1";
                } else if (dstExternal) {
                    // Src local -> Gateway -> Dest external
                    const linkId1 = `192.168.1.1-to-${dst}`;
                    linkMap.set(linkId1, { source: "192.168.1.1", target: dst, weight: 1.5 });
                    targetNode = "192.168.1.1";
                }

                const flowKey = `${sourceNode}-to-${targetNode}`;
                linkMap.set(flowKey, {
                    source: sourceNode,
                    target: targetNode,
                    protocol: p.protocol,
                    port: p.destination_port,
                    weight: 2
                });

                // Spawn flow animation particle periodically
                if (Math.random() < 0.15 && sim.particles.length < 50) {
                    sim.particles.push({
                        source: sourceNode,
                        target: targetNode,
                        progress: 0,
                        speed: 0.01 + Math.random() * 0.015,
                        color: getProtocolColor(p.protocol)
                    });
                }
            }
        });

        sim.nodes = newNodes;
        sim.links = Array.from(linkMap.values());
    };

    const getProtocolColor = (proto) => {
        switch (proto?.toUpperCase()) {
            case "TCP": return "#3b82f6"; // Blue
            case "UDP": return "#10b981"; // Green
            case "DNS": return "#a78bfa"; // Purple
            case "ICMP": return "#f59e0b"; // Orange
            default: return "#94a3b8"; // Steel
        }
    };

    useEffect(() => {
        fetchData();
        const pollInterval = setInterval(fetchData, 4000);
        return () => clearInterval(pollInterval);
    }, []);

    // ----------------------------------------------------
    // Canvas animation loops
    // ----------------------------------------------------
    useEffect(() => {
        let animationFrameId;
        const sim = simulationRef.current;
        const width = 800;
        const height = 450;

        const updateSimulation = () => {
            const nodes = sim.nodes;
            const links = sim.links;

            // 1. Damping/friction
            nodes.forEach(n => {
                n.vx *= 0.82;
                n.vy *= 0.82;
            });

            // 2. Center gravity pulling nodes back
            nodes.forEach(n => {
                const dx = width / 2 - n.x;
                const dy = height / 2 - n.y;
                n.vx += dx * 0.0015;
                n.vy += dy * 0.0015;
            });

            // 3. Node-to-Node Repulsion
            for (let i = 0; i < nodes.length; i++) {
                const n1 = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const n2 = nodes[j];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const minDist = n1.size + n2.size + 45;
                    
                    if (dist < minDist) {
                        const force = (minDist - dist) / dist * 0.15;
                        n1.vx += dx * force;
                        n1.vy += dy * force;
                        n2.vx -= dx * force;
                        n2.vy -= dy * force;
                    }
                }
            }

            // 4. Link constraints (pulling connected nodes together)
            links.forEach(link => {
                const sNode = nodes.find(n => n.id === link.source);
                const tNode = nodes.find(n => n.id === link.target);
                
                if (sNode && tNode) {
                    const dx = tNode.x - sNode.x;
                    const dy = tNode.y - sNode.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const desiredDist = 120;
                    const force = (dist - desiredDist) / dist * 0.035;
                    
                    sNode.vx += dx * force;
                    sNode.vy += dy * force;
                    tNode.vx -= dx * force;
                    tNode.vy -= dy * force;
                }
            });

            // 5. Update positions & boundaries
            nodes.forEach(n => {
                // Pin Operator terminal & router slightly so layout is anchored
                if (n.id === "192.168.1.100") {
                    n.x = 120;
                    n.y = height / 2;
                    return;
                }
                if (n.id === "192.168.1.1") {
                    n.x = 320;
                    n.y = height / 2;
                    return;
                }

                n.x += n.vx;
                n.y += n.vy;

                // Keep inside boundaries
                n.x = Math.max(n.size + 15, Math.min(width - n.size - 15, n.x));
                n.y = Math.max(n.size + 15, Math.min(height - n.size - 15, n.y));
            });

            // 6. Update traversal particles
            sim.particles.forEach((p, idx) => {
                p.progress += p.speed;
                if (p.progress >= 1.0) {
                    sim.particles.splice(idx, 1);
                }
            });
        };

        const drawTopology = () => {
            const canvas = canvasRef.current;
            if (!canvas || activeTab !== "topology") return;
            const ctx = canvas.getContext("2d");
            
            // Clear
            ctx.clearRect(0, 0, width, height);

            // Draw links
            sim.links.forEach(link => {
                const s = sim.nodes.find(n => n.id === link.source);
                const t = sim.nodes.find(n => n.id === link.target);
                if (s && t) {
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(t.x, t.y);
                    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });

            // Draw flow particles
            sim.particles.forEach(p => {
                const s = sim.nodes.find(n => n.id === p.source);
                const t = sim.nodes.find(n => n.id === p.target);
                if (s && t) {
                    const px = s.x + (t.x - s.x) * p.progress;
                    const py = s.y + (t.y - s.y) * p.progress;
                    ctx.beginPath();
                    ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
                    ctx.fillStyle = p.color;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = p.color;
                    ctx.fill();
                    ctx.shadowBlur = 0; // reset
                }
            });

            // Draw nodes
            sim.nodes.forEach(n => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.size, 0, 2 * Math.PI);
                
                // Color node by roles
                let fill = "rgba(15, 23, 42, 0.9)";
                let stroke = "rgba(59, 130, 246, 0.7)";
                let glowColor = "rgba(59, 130, 246, 0.3)";
                
                if (n.type === "local") {
                    fill = "rgba(16, 185, 129, 0.15)";
                    stroke = "#10b981";
                    glowColor = "rgba(16, 185, 129, 0.4)";
                } else if (n.type === "gateway") {
                    fill = "rgba(167, 139, 250, 0.15)";
                    stroke = "#a78bfa";
                    glowColor = "rgba(167, 139, 250, 0.4)";
                } else if (n.type === "external") {
                    fill = "rgba(245, 158, 11, 0.15)";
                    stroke = "#f59e0b";
                    glowColor = "rgba(245, 158, 11, 0.4)";
                }

                // If selected
                const isSelected = selectedNode && selectedNode.id === n.id;
                
                ctx.fillStyle = fill;
                ctx.strokeStyle = stroke;
                ctx.lineWidth = isSelected ? 3.5 : 2;
                ctx.shadowBlur = isSelected ? 12 : 5;
                ctx.shadowColor = glowColor;
                ctx.fill();
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Label tag
                ctx.fillStyle = "rgba(11, 15, 26, 0.85)";
                ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
                ctx.lineWidth = 1;
                
                const labelText = n.id;
                ctx.font = "9px 'JetBrains Mono', monospace";
                const textWidth = ctx.measureText(labelText).width;
                
                ctx.fillRect(n.x - textWidth / 2 - 5, n.y + n.size + 5, textWidth + 10, 14);
                ctx.strokeRect(n.x - textWidth / 2 - 5, n.y + n.size + 5, textWidth + 10, 14);
                
                ctx.fillStyle = "#cbd5e1";
                ctx.textAlign = "center";
                ctx.fillText(labelText, n.x, n.y + n.size + 15);
            });
        };

        const runTopology = () => {
            updateSimulation();
            drawTopology();
            animationFrameId = requestAnimationFrame(runTopology);
        };

        if (activeTab === "topology") {
            runTopology();
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [activeTab, selectedNode]);

    // Click handler for nodes
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Find clicked node
        const clicked = simulationRef.current.nodes.find(n => {
            const dist = Math.sqrt((n.x - clickX) ** 2 + (n.y - clickY) ** 2);
            return dist <= n.size + 8;
        });

        setSelectedNode(clicked || null);
    };

    // ----------------------------------------------------
    // GeoIP Map Drawing
    // ----------------------------------------------------
    useEffect(() => {
        const canvas = geoCanvasRef.current;
        if (!canvas || activeTab !== "geoip") return;
        const ctx = canvas.getContext("2d");
        const w = 800;
        const h = 450;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Draw Mercator Latitude/Longitude lines and radar grids
        ctx.strokeStyle = "rgba(30, 41, 59, 0.3)";
        ctx.lineWidth = 0.8;
        
        // Grid vertical lines
        for (let x = 50; x < w; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        // Grid horizontal lines
        for (let y = 50; y < h; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Draw coordinate text indicators
        ctx.fillStyle = "#475569";
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText("LAT: +90°N / -90°S", 10, h - 25);
        ctx.fillText("LON: -180°W / +180°E", 10, h - 15);

        // Draw Intranet Base Center (Local Terminal) at USA coordinates or arbitrary baseline center
        const centerLat = 37.0; // USA
        const centerLon = -95.0;
        
        const mapCoords = (latitude, longitude) => {
            // Mercator projection translation
            // Map longitude -180 to 180 to 50 to width-50
            const x = ((longitude + 180) / 360) * (w - 100) + 50;
            // Map latitude 90 to -90 to 50 to height-50
            const y = ((90 - latitude) / 180) * (h - 100) + 50;
            return { x, y };
        };

        const home = mapCoords(centerLat, centerLon);

        // Draw local hub node
        ctx.beginPath();
        ctx.arc(home.x, home.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#10b981";
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = "#cbd5e1";
        ctx.textAlign = "center";
        ctx.fillText("HOME HUB (OPERATOR)", home.x, home.y - 12);

        // Plot geolocated endpoints
        Object.keys(geoLocations).forEach(ip => {
            const geo = geoLocations[ip];
            if (geo.lat !== null && geo.lon !== null) {
                const target = mapCoords(geo.lat, geo.lon);

                // Draw flight line connection
                ctx.beginPath();
                ctx.moveTo(home.x, home.y);
                
                // Draw curve arc (quadratic bezier curve)
                const ctrlX = (home.x + target.x) / 2;
                const ctrlY = Math.min(home.y, target.y) - 60; // offset peak
                ctx.quadraticCurveTo(ctrlX, ctrlY, target.x, target.y);
                
                ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw target node dot
                ctx.beginPath();
                ctx.arc(target.x, target.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
                ctx.strokeStyle = "#f59e0b";
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 6;
                ctx.shadowColor = "#f59e0b";
                ctx.fill();
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Draw location labels
                ctx.fillStyle = "#94a3b8";
                ctx.textAlign = "left";
                ctx.fillText(`${geo.city}, ${geo.country}`, target.x + 8, target.y + 3);
            }
        });

    }, [activeTab, geoLocations]);

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-[#1e293b]/60">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Network Map & GeoIP</h1>
                    <p className="text-xs text-slate-400 font-mono">Dynamic node routing canvas & offline geolocation threat logs.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Tab Navigation */}
                    <div className="flex bg-[#0f172a] border border-[#1e293b] p-0.5 rounded-lg">
                        <button
                            onClick={() => { setActiveTab("topology"); setSelectedNode(null); }}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                                activeTab === "topology" 
                                    ? "bg-blue-600 text-white shadow-lg" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <FaProjectDiagram />
                            <span>Topology</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab("geoip"); setSelectedNode(null); }}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                                activeTab === "geoip" 
                                    ? "bg-blue-600 text-white shadow-lg" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <FaGlobe />
                            <span>GeoIP Threat Map</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab("analytics"); setSelectedNode(null); }}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                                activeTab === "analytics" 
                                    ? "bg-blue-600 text-white shadow-lg" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <FaChartBar />
                            <span>Traffic Analytics</span>
                        </button>
                    </div>

                    <button
                        onClick={fetchData}
                        className="bg-[#161f30] hover:bg-[#1d2a42] border border-[#1e293b] text-slate-200 text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 font-semibold"
                    >
                        <FaSync />
                        <span>RE-SCAN</span>
                    </button>
                </div>
            </div>

            {/* Visualizer Panel Container */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Visualizer Stage */}
                <div className="lg:col-span-3 bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    
                    {activeTab === "topology" && (
                        <>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Live Routing Layout (Interactive)</span>
                                <div className="flex gap-4 text-[9px] font-mono font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/25 border border-emerald-500" /> Intranet</span>
                                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500/25 border border-purple-500" /> Router</span>
                                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/25 border border-amber-500" /> Cloud Node</span>
                                </div>
                            </div>

                            <div className="relative border border-[#1e293b]/40 rounded-xl bg-[#090d16] flex items-center justify-center min-h-[450px]">
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={450}
                                    onClick={handleCanvasClick}
                                    className="cursor-crosshair w-full aspect-[16/9] block"
                                />
                            </div>
                        </>
                    )}

                    {activeTab === "geoip" && (
                        <>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Global Geolocation Coordinate Matrix</span>
                                <span className="text-[9px] text-sky-400 font-bold font-mono uppercase tracking-widest animate-pulse">Offline DB Resolver Active</span>
                            </div>

                            <div className="relative border border-[#1e293b]/40 rounded-xl bg-[#090d16] flex items-center justify-center min-h-[450px]">
                                <canvas
                                    ref={geoCanvasRef}
                                    width={800}
                                    height={450}
                                    className="w-full aspect-[16/9] block"
                                />
                            </div>
                        </>
                    )}

                    {activeTab === "analytics" && (
                        <div className="space-y-6">
                            {/* Two charts row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Size Distribution */}
                                <div className="bg-[#090d16] border border-[#1e293b]/40 p-4 rounded-xl">
                                    <h3 className="text-xs text-slate-400 uppercase font-bold font-mono mb-4">Packet Size Distribution</h3>
                                    <div className="h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getPacketSizeDistribution()} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                                <XAxis dataKey="range" stroke="#475569" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                                                <YAxis stroke="#475569" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-[#0b0f19] border border-[#1e293b] p-2 rounded-lg text-xs font-mono">
                                                                    <span>Packets: {payload[0].value}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                    {getPacketSizeDistribution().map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Protocol Distribution */}
                                <div className="bg-[#090d16] border border-[#1e293b]/40 p-4 rounded-xl">
                                    <h3 className="text-xs text-slate-400 uppercase font-bold font-mono mb-4">Protocol Volume Share</h3>
                                    <div className="h-56 flex items-center justify-center">
                                        {getProtocolDistribution().length === 0 ? (
                                            <span className="text-xs text-slate-500 font-mono">No telemetry</span>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={getProtocolDistribution()}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={75}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {getProtocolDistribution().map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-[#0b0f19] border border-[#1e293b] p-2 rounded-lg text-xs font-mono">
                                                                        <span>{payload[0].name}: {payload[0].value} pkts</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active connection flows */}
                            <div className="bg-[#090d16] border border-[#1e293b]/40 p-4 rounded-xl">
                                <h3 className="text-xs text-slate-400 uppercase font-bold font-mono mb-4">Active Socket Flows (Top Streams)</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left font-mono text-[11px]">
                                        <thead>
                                            <tr className="border-b border-[#1e293b] text-slate-500">
                                                <th className="py-2">Source Host</th>
                                                <th className="py-2">→</th>
                                                <th className="py-2">Destination Host</th>
                                                <th className="py-2">Proto</th>
                                                <th className="py-2 text-right">Packets</th>
                                                <th className="py-2 text-right">Volume</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e293b]/40 text-slate-300">
                                            {getActiveFlows().map((flow, i) => (
                                                <tr key={i} className="hover:bg-[#161f30]/30 transition-colors">
                                                    <td className="py-2 text-emerald-400 font-bold">{flow.source}</td>
                                                    <td className="py-2 text-slate-600">→</td>
                                                    <td className="py-2 text-amber-400 font-bold">{flow.target}</td>
                                                    <td className="py-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#1e293b]" style={{ borderColor: `${getProtocolColor(flow.protocol)}30`, color: getProtocolColor(flow.protocol), background: `${getProtocolColor(flow.protocol)}08` }}>{flow.protocol}</span></td>
                                                    <td className="py-2 text-right font-bold">{flow.packetsCount}</td>
                                                    <td className="py-2 text-right text-slate-400 font-bold">{(flow.bytesCount / 1024).toFixed(2)} KB</td>
                                                </tr>
                                            ))}
                                            {getActiveFlows().length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="py-8 text-center text-slate-500 font-semibold">No active communication flows observed.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Inspector Details Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#111726] border border-[#1e293b] rounded-2xl p-5 shadow-xl h-full flex flex-col justify-between min-h-[400px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e293b]/60">
                                <FaInfoCircle className="text-blue-400 text-sm" />
                                <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Endpoint Inspector</h2>
                            </div>

                            {selectedNode ? (
                                <div className="space-y-4 font-mono text-[11px]">
                                    <div>
                                        <span className="text-slate-500 uppercase text-[9px] block">IP Address</span>
                                        <span className="text-white text-xs font-bold font-mono">{selectedNode.id}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 uppercase text-[9px] block">Category Label</span>
                                        <span className="text-sky-300 font-semibold">{selectedNode.label}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 uppercase text-[9px] block">Network Context</span>
                                        <span className="text-slate-300 capitalize">{selectedNode.type} subnet range</span>
                                    </div>

                                    {!isPrivateIP(selectedNode.id) && geoLocations[selectedNode.id] && (
                                        <>
                                            <div>
                                                <span className="text-slate-500 uppercase text-[9px] block">Geolocation</span>
                                                <span className="text-slate-300">
                                                    {geoLocations[selectedNode.id].city}, {geoLocations[selectedNode.id].country}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 uppercase text-[9px] block">Provider Org</span>
                                                <span className="text-amber-300">{geoLocations[selectedNode.id].org}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 uppercase text-[9px] block">Coordinates</span>
                                                <span className="text-slate-400">
                                                    Lat: {geoLocations[selectedNode.id].lat.toFixed(4)}, Lon: {geoLocations[selectedNode.id].lon.toFixed(4)}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Icon Preview */}
                                    <div className="h-28 rounded-xl border border-[#1e293b]/40 bg-[#090d16]/60 flex items-center justify-center text-4xl text-slate-700">
                                        {selectedNode.type === "local" && <FaDesktop className="text-emerald-500/20" />}
                                        {selectedNode.type === "gateway" && <FaHdd className="text-purple-500/20" />}
                                        {selectedNode.type === "external" && <FaCloud className="text-amber-500/20" />}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-52 flex items-center justify-center text-center text-slate-500 text-xs py-8 font-mono leading-relaxed">
                                    Click any node on the topology canvas to inspect real-time connection routing details.
                                </div>
                            )}
                        </div>

                        {/* Summary metadata footer */}
                        <div className="pt-4 border-t border-[#1e293b]/40 text-[10px] text-slate-500 font-mono">
                            <div>PACKETS INSPECTED: {packets.length}</div>
                            <div className="mt-1">ACTIVE PUBLIC ENDPOINTS: {Object.keys(geoLocations).length}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Topology;
