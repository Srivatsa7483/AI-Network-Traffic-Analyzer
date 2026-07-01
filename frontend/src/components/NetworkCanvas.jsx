import { useEffect, useRef } from "react";

// Animated network graph canvas background
function NetworkCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let animFrameId;
        let nodes = [];
        let packets = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // Node colors by type
        const NODE_COLORS = {
            normal: "#3b82f6",
            threat: "#f43f5e",
            safe: "#10b981",
            gateway: "#a78bfa",
        };

        // Generate random nodes
        const spawnNodes = () => {
            nodes = [];
            const count = Math.floor((canvas.width * canvas.height) / 28000);
            for (let i = 0; i < Math.max(count, 14); i++) {
                const types = ["normal", "normal", "normal", "safe", "safe", "threat", "gateway"];
                const type = types[Math.floor(Math.random() * types.length)];
                nodes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.18,
                    r: type === "gateway" ? 5 : Math.random() * 2.5 + 1.5,
                    type,
                    color: NODE_COLORS[type],
                    label: type === "gateway"
                        ? `GW-${Math.floor(Math.random() * 255)}`
                        : `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    pulsePhase: Math.random() * Math.PI * 2,
                });
            }
        };
        spawnNodes();

        // Periodically spawn data packets between connected nodes
        const spawnPacket = () => {
            if (nodes.length < 2) return;
            const from = nodes[Math.floor(Math.random() * nodes.length)];
            const to = nodes[Math.floor(Math.random() * nodes.length)];
            if (from === to) return;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 420) return; // only nearby nodes
            packets.push({
                from,
                to,
                progress: 0,
                speed: Math.random() * 0.006 + 0.003,
                color: from.type === "threat" ? "#f43f5e" : from.type === "safe" ? "#10b981" : "#60a5fa",
                size: Math.random() * 2.5 + 1.5,
            });
        };

        let lastPacketTime = 0;
        let t = 0;

        const MAX_EDGE_DIST = 320;

        const draw = (timestamp) => {
            t += 0.005;

            // Spawn new packets
            if (timestamp - lastPacketTime > 160) {
                spawnPacket();
                lastPacketTime = timestamp;
            }

            // Clear with dark semi-transparent fade for trail effect
            ctx.fillStyle = "rgba(8, 11, 17, 0.22)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw edges between nearby nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MAX_EDGE_DIST) {
                        const alpha = (1 - dist / MAX_EDGE_DIST) * 0.18;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(100, 149, 237, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            // Draw packets
            packets = packets.filter((p) => {
                p.progress += p.speed;
                if (p.progress >= 1) return false;
                const x = p.from.x + (p.to.x - p.from.x) * p.progress;
                const y = p.from.y + (p.to.y - p.from.y) * p.progress;

                // Glow effect
                const grd = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
                grd.addColorStop(0, p.color + "cc");
                grd.addColorStop(1, p.color + "00");
                ctx.beginPath();
                ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();

                // Core dot
                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                return true;
            });

            // Draw nodes
            nodes.forEach((n) => {
                // Move
                n.x += n.vx;
                n.y += n.vy;
                // Bounce
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

                // Pulse ring for gateway nodes
                if (n.type === "gateway") {
                    const pulse = Math.sin(t * 2 + n.pulsePhase) * 0.5 + 0.5;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, n.r + 6 + pulse * 6, 0, Math.PI * 2);
                    ctx.strokeStyle = n.color + "44";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                // Glow
                const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
                grd.addColorStop(0, n.color + "66");
                grd.addColorStop(1, n.color + "00");
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();

                // Core
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.fill();

                // Label for gateway nodes
                if (n.type === "gateway" && canvas.width > 600) {
                    ctx.fillStyle = n.color + "aa";
                    ctx.font = "9px 'JetBrains Mono', monospace";
                    ctx.fillText(n.label, n.x + 8, n.y - 4);
                }
            });

            animFrameId = requestAnimationFrame(draw);
        };

        animFrameId = requestAnimationFrame(draw);

        // Re-spawn nodes on resize
        window.addEventListener("resize", spawnNodes);

        return () => {
            cancelAnimationFrame(animFrameId);
            window.removeEventListener("resize", resize);
            window.removeEventListener("resize", spawnNodes);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: -1,
                pointerEvents: "none",
                opacity: 0.5,
                background: "#050810",
            }}
        />
    );
}

export default NetworkCanvas;
