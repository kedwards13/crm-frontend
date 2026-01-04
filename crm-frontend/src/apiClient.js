// src/apiClient.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://os.abon.ai/api",
  withCredentials: true,
});

// 🔹 Request Interceptor
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("access_token");
  const tenant = JSON.parse(localStorage.getItem("activeTenant") || "{}");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenant?.id) config.headers["X-Tenant-ID"] = tenant.id;
  if (tenant?.domain) config.headers["X-Tenant-Domain"] = tenant.domain;
  if (tenant?.industry) config.headers["X-Tenant-Industry"] = tenant.industry;

  return config;
});

let isRefreshing = false;
let queue = [];

// 🔹 Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status !== 401 || config._retry) {
      return Promise.reject(error);
    }

    // avoid looping on refresh call
    if (config.url.includes("/accounts/auth/refresh/")) {
      localStorage.clear();
      return Promise.reject(error);
    }

    config._retry = true;
    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      localStorage.clear();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config });
      });
    }

    try {
      isRefreshing = true;
      const { data } = await api.post("/accounts/auth/refresh/", { refresh });
      const newAccess = data?.access;

      if (newAccess) {
        localStorage.setItem("token", newAccess);
        localStorage.setItem("access_token", newAccess);
      }

      queue.forEach(({ resolve, config }) => {
        config.headers.Authorization = `Bearer ${newAccess}`;
        resolve(api(config));
      });
      queue = [];

      config.headers.Authorization = `Bearer ${newAccess}`;
      return api(config);
    } catch (err) {
      queue.forEach(({ reject }) => reject(err));
      queue = [];
      localStorage.clear();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;