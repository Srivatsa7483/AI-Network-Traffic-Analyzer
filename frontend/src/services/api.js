import axios from "axios";

const API = axios.create({
    // Nginx proxies /api/* → Flask backend on port 5000
    // This works identically in local Docker and on any cloud server
    baseURL: "/api"
});

// Interceptor to attach JWT token to all requests dynamically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default API;