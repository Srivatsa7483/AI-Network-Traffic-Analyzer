import { useEffect, useRef } from "react";

function Auth3DBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let animId;
        const particles = [];
        const numParticles = 180;
        const radius = 220;
        
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", resize);

        // Generate coordinates on a 3D sphere surface
        for (let i = 0; i < numParticles; i++) {
            const theta = Math.acos(Math.random() * 2 - 1);
            const phi = Math.random() * Math.PI * 2;

            particles.push({
                x: radius * Math.sin(theta) * Math.cos(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(theta),
                baseSize: Math.random() * 1.5 + 1
            });
        }

        // Angles of rotation
        let angleX = 0.0018;
        let angleY = 0.0028;

        const rotateX = (point, angle) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const y = point.y * cos - point.z * sin;
            const z = point.z * cos + point.y * sin;
            point.y = y;
            point.z = z;
        };

        const rotateY = (point, angle) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x = point.x * cos - point.z * sin;
            const z = point.z * cos + point.x * sin;
            point.x = x;
            point.z = z;
        };

        const draw = () => {
            ctx.fillStyle = "rgba(5, 8, 16, 0.3)";
            ctx.fillRect(0, 0, width, height);

            const fov = 400; // Field of View (Perspective)
            const centerX = width / 2;
            const centerY = height / 2;

            // Sort particles by Z-depth for correct overlapping render
            particles.sort((a, b) => b.z - a.z);

            // Draw links between nearby particles
            const maxLinkDist = 90;
            ctx.lineWidth = 0.5;

            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                
                // Rotate
                rotateX(p1, angleX);
                rotateY(p1, angleY);

                // Project 3D coordinates to 2D
                const scale1 = fov / (fov + p1.z);
                const x2d1 = centerX + p1.x * scale1;
                const y2d1 = centerY + p1.y * scale1;

                // Skip drawing if outside screen
                if (x2d1 < 0 || x2d1 > width || y2d1 < 0 || y2d1 > height) continue;

                // Shading based on Z depth
                const depthAlpha = (fov - p1.z) / (fov * 2); // Closer = brighter, further = dimmer
                const alpha = Math.max(0.1, Math.min(depthAlpha, 0.8));

                // Draw connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dz = p1.z - p2.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < maxLinkDist) {
                        const scale2 = fov / (fov + p2.z);
                        const x2d2 = centerX + p2.x * scale2;
                        const y2d2 = centerY + p2.y * scale2;

                        const linkAlpha = (1 - dist / maxLinkDist) * alpha * 0.28;
                        ctx.strokeStyle = `rgba(59, 130, 246, ${linkAlpha})`;
                        ctx.beginPath();
                        ctx.moveTo(x2d1, y2d1);
                        ctx.lineTo(x2d2, y2d2);
                        ctx.stroke();
                    }
                }

                // Draw Core Particle
                const size = p1.baseSize * scale1 * 1.5;
                ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.95})`;
                ctx.beginPath();
                ctx.arc(x2d1, y2d1, size, 0, Math.PI * 2);
                ctx.fill();

                // Draw soft glow ring around closer particles
                if (p1.z < 0) {
                    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.25})`;
                    ctx.beginPath();
                    ctx.arc(x2d1, y2d1, size * 2.5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
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
                zIndex: 0,
                pointerEvents: "none",
                opacity: 0.85
            }}
        />
    );
}

export default Auth3DBackground;
