// src/apiClient.js
import axios from "axios";

// ------------------------------
// ⚙️ Create base Axios instance
// ------------------------------
const api = axios.create({
  baseURL: "https://os.abon.ai/api",
  withCredentials: true,
});

// ------------------------------
// 🧠 Request Interceptor
// Attach JWT + tenant headers
// ------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  const tenant = JSON.parse(localStorage.getItem("activeTenant") || "{}");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenant?.id)       config.headers["X-Tenant-ID"] = tenant.id;
  if (tenant?.domain)   config.headers["X-Tenant-Domain"] = tenant.domain;
  if (tenant?.industry) config.headers["X-Tenant-Industry"] = tenant.industry;

  return config;
});

// ------------------------------
// 🔄 Token Refresh Logic
// Auto-refresh access token on 401
// ------------------------------
let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Skip non-401 errors or retried requests
    if (response?.status !== 401 || config._retry) {
      return Promise.reject(error);
    }

    // Avoid infinite refresh loops
    config._retry = true;

    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      localStorage.clear(); // Clear stale tokens
      return Promise.reject(error);
    }

    // If refresh already in progress → queue the request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config });
      });
    }

    // Start refresh process
    try {
      isRefreshing = true;
      const { data } = await api.post("/accounts/auth/refresh/", { refresh });
    
      const newAccess = data?.access;
      if (newAccess) {
        localStorage.setItem("token", newAccess);
        localStorage.setItem("access_token", newAccess);
      }
    
      // Replay queued requests
      queue.forEach(({ resolve, config }) => {
        config.headers.Authorization = `Bearer ${newAccess}`;
        resolve(api(config));
      });
      queue = [];
    
      // Replay original request
      config.headers.Authorization = `Bearer ${newAccess}`;
      return api(config);
      
    } catch (err) {
      // Clear all queued requests and localStorage
      queue.forEach(({ reject }) => reject(err));
      queue = [];
      localStorage.clear();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

// ------------------------------
// ✅ Export Axios instance
// ------------------------------
export default api;