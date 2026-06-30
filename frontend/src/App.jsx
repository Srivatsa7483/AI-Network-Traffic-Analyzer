import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NetworkCanvas from "./components/NetworkCanvas";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth3DBackground from "./components/Auth3DBackground";
import { AuthProvider, useAuth } from "./contexts/AuthContext";


// Pages
import Dashboard from "./pages/Dashboard";
import LiveCapture from "./pages/LiveCapture";
import Packets from "./pages/Packets";
import Alerts from "./pages/Alerts";
import Sessions from "./pages/Sessions";
import AI from "./pages/AI";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

function AppContent() {
    const { user } = useAuth();

    // Dynamically apply selected styling theme
    useEffect(() => {
        const savedTheme = localStorage.getItem("active_theme") || "cyberpunk";
        document.documentElement.classList.remove("theme-cyberpunk", "theme-matrix", "theme-threat", "theme-obsidian");
        document.documentElement.classList.add(`theme-${savedTheme}`);
    }, []);

    // Full-page layout for unauthenticated users (Login / Register)
    if (!user) {
        return (
            <div 
                className="min-h-screen w-screen text-[#f0f4ff] overflow-y-auto flex items-center justify-center hex-grid-bg"
                style={{ position: "relative", zIndex: 1, background: "transparent" }}
            >
                <Auth3DBackground />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </div>
        );
    }

    // Standard workspace layout for authenticated operators
    return (
        <div
            className="flex h-screen w-screen text-[#f0f4ff] overflow-hidden hex-grid-bg"
            style={{ position: "relative", zIndex: 1, background: "rgba(5, 8, 16, 0.82)" }}
        >
            {/* Render 2D network canvas background only for logged in sessions */}
            <NetworkCanvas />

            {/* Collapsible Left Sidebar */}
            <Sidebar />

            {/* Main Content Workspace */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Top Header */}
                <Navbar />

                {/* Dynamic Scrollable Panel */}
                <main
                    className="flex-1 overflow-y-auto p-6 md:p-8"
                    style={{ background: "rgba(5, 8, 16, 0.55)" }}
                >
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/capture" element={
                            <ProtectedRoute allowedRoles={["Admin"]}>
                                <LiveCapture />
                            </ProtectedRoute>
                        } />
                        <Route path="/packets" element={
                            <ProtectedRoute allowedRoles={["Admin", "Analyst"]}>
                                <Packets />
                            </ProtectedRoute>
                        } />
                        <Route path="/alerts" element={
                            <ProtectedRoute allowedRoles={["Admin", "Analyst"]}>
                                <Alerts />
                            </ProtectedRoute>
                        } />
                        <Route path="/sessions" element={
                            <ProtectedRoute allowedRoles={["Admin", "Analyst"]}>
                                <Sessions />
                            </ProtectedRoute>
                        } />
                        <Route path="/ai" element={
                            <ProtectedRoute allowedRoles={["Admin", "Analyst"]}>
                                <AI />
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute allowedRoles={["Admin"]}>
                                <Settings />
                            </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>

                {/* Bottom Status Bar */}
                <Footer />
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                {/* Scanline overlay */}
                <div className="scanlines" style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }} />

                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;