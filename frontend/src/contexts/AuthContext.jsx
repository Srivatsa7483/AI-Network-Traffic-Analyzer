import { createContext, useState, useEffect, useContext } from "react";
import authApi from "../services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("auth_token");
            const savedUser = localStorage.getItem("auth_user");
            
            if (token && savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                    // Try to fetch latest profile to verify token validity
                    const freshProfile = await authApi.getProfile();
                    setUser(freshProfile);
                    localStorage.setItem("auth_user", JSON.stringify(freshProfile));
                } catch (error) {
                    console.error("Token verification failed, logging out", error);
                    logout();
                }
            }
            setLoading(false);
        };
        
        checkAuth();
    }, []);

    const login = async (username, password) => {
        setLoading(true);
        try {
            const data = await authApi.login(username, password);
            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            setUser(data.user);
            return data.user;
        } catch (error) {
            logout();
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, email, password, role = "Analyst") => {
        return await authApi.register(username, email, password, role);
    };

    const logout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setUser(null);
    };

    const updateProfile = async (username, email) => {
        await authApi.updateProfile(username, email);
        const updatedUser = { ...user, username, email };
        setUser(updatedUser);
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
