import { useState, useEffect, useCallback } from "react";
import API from "../services/api";

export function useLiveData(endpoint, interval = 3000) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const response = await API.get(endpoint);
            setData(response.data);
            setLoading(false);
            setError(null);
        } catch (err) {
            setError(err);
            setLoading(false);
        }
    }, [endpoint]);

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, interval);
        return () => clearInterval(timer);
    }, [fetchData, interval]);

    return { data, loading, error, refetch: fetchData };
}
