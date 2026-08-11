import axios from "axios";

// Create a centralized Axios instance targeting your FastAPI backend
const API = axios.create({
  baseURL: "http://127.0.0.1:8000", // FastAPI Default Port & IP
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token into authorization headers for secure routes
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default API;
