// src/apiClient.js
import axios from "axios";
import { API_BASE_URL } from "./config/env";
import {
  clearActiveTenant,
  getActiveTenant,
  tenantSelectionRequiredError,
} from "./helpers/tenantHelpers";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

export const normalizeArray = (value) =>
  Array.isArray(value) ? value : value?.results ?? [];

const TENANT_OPTIONAL_PATHS = [
  "/accounts/auth/login/",
  "/accounts/auth/refresh/",
  "/accounts/auth/switch-tenant/",
  "/accounts/tenant-signup/",
];

const requiresTenant = (url = "") =>
  !TENANT_OPTIONAL_PATHS.some((path) => url?.includes(path));

// 🔹 Request Interceptor
api.interceptors.request.use((config) => {
  const tenant = getActiveTenant();
  const token =
    localStorage.getItem("token") || localStorage.getItem("access_token");

  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const needsTenant = requiresTenant(config.url);
  if (needsTenant && !tenant?.id) {
    return Promise.reject(tenantSelectionRequiredError());
  }

  if (tenant?.id) config.headers["X-Tenant-ID"] = tenant.id;

  return config;
});

let isRefreshing = false;
let queue = [];

// 🔹 Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status === 403) {
      clearActiveTenant();
      window.location.href = "/select-account";
      return Promise.reject(error);
    }

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
      const tenant = getActiveTenant();

      if (newAccess) {
        localStorage.setItem("token", newAccess);
        localStorage.setItem("access_token", newAccess);
      }

      queue.forEach(({ resolve, config }) => {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newAccess}`;
        if (tenant?.id) config.headers["X-Tenant-ID"] = tenant.id;
        resolve(api(config));
      });
      queue = [];

      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${newAccess}`;
      if (tenant?.id) config.headers["X-Tenant-ID"] = tenant.id;
      return api(config);
    } catch (err) {
      queue.forEach(({ reject }) => reject(err));
      queue = [];
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    // Surface errors during stabilization to avoid silent failures
    console.error("Unhandled API error:", e?.reason || e);
  });
}

export default api;
