import API from "./api";

const authApi = {
    login: async (username, password) => {
        const response = await API.post("/auth/login", { username, password });
        return response.data;
    },
    register: async (username, email, password, role = "Analyst") => {
        const response = await API.post("/auth/register", { username, email, password, role });
        return response.data;
    },
    getProfile: async () => {
        const response = await API.get("/auth/profile");
        return response.data;
    },
    updateProfile: async (username, email) => {
        const response = await API.put("/auth/profile", { username, email });
        return response.data;
    }
};

export default authApi;
