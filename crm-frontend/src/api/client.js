import axios from "axios";
import { API_BASE_URL } from "../config/env";
import {
  clearActiveTenant,
  getActiveTenant,
  tenantSelectionRequiredError,
} from "../helpers/tenantHelpers";

const TENANT_OPTIONAL_PATHS = [
  "/accounts/auth/login/",
  "/accounts/auth/refresh/",
  "/accounts/auth/switch-tenant/",
  "/accounts/auth/tenant-signup/",
  "/accounts/tenant-signup/",
  "/accounts/auth/forgot-password/",
  "/accounts/auth/verify-reset-code/",
  "/accounts/auth/reset-password/",
  "/accounts/auth/accept-invite/",
];

const requiresTenant = (url = "") =>
  !TENANT_OPTIONAL_PATHS.some((path) => String(url || "").includes(path));

export const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  const candidate = value || {};
  const keys = [
    "results",
    "data",
    "items",
    "rows",
    "threads",
    "messages",
    "calls",
    "campaigns",
    "customers",
    "leads",
  ];
  for (const key of keys) {
    if (Array.isArray(candidate?.[key])) return candidate[key];
  }
  return [];
};

export const toApiError = (error, fallbackMessage = "Request failed") => {
  const status = Number(error?.response?.status || 0) || null;
  const payload = error?.response?.data || {};
  const message =
    payload?.detail ||
    payload?.message ||
    payload?.error ||
    error?.message ||
    fallbackMessage;
  const normalized = new Error(String(message));
  normalized.status = status;
  normalized.code =
    error?.code ||
    payload?.code ||
    (status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "API_ERROR");
  normalized.payload = payload;
  normalized.original = error;
  return normalized;
};

export const withLoading = async (setLoading, task) => {
  if (typeof setLoading === "function") setLoading(true);
  try {
    return await task();
  } finally {
    if (typeof setLoading === "function") setLoading(false);
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
});

apiClient.interceptors.request.use(
  (config) => {
    const tenant = getActiveTenant();
    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
    const needsTenant = requiresTenant(config.url);

    config.headers = config.headers || {};
    if (token) config.headers.Authorization = `Bearer ${token}`;

    if (needsTenant && !tenant?.id) {
      return Promise.reject(tenantSelectionRequiredError());
    }

    if (tenant?.id) config.headers["X-Tenant-ID"] = tenant.id;
    if (tenant?.domain) config.headers["X-Tenant-Domain"] = tenant.domain;
    if (tenant?.industry) config.headers["X-Tenant-Industry"] = tenant.industry;
    return config;
  },
  (error) => Promise.reject(toApiError(error))
);

let isRefreshing = false;
let refreshQueue = [];

const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);
const isIdempotent = (config) =>
  IDEMPOTENT_METHODS.has(String(config?.method || "get").toLowerCase());

const flushRefreshQueue = (nextAccess, refreshError) => {
  refreshQueue.forEach(({ resolve, reject, config }) => {
    if (refreshError) {
      reject(refreshError);
      return;
    }
    // Only auto-retry idempotent requests after token refresh.
    // Non-idempotent requests (POST, PATCH, PUT, DELETE) must not be
    // replayed — they could create duplicate records.
    if (!isIdempotent(config)) {
      reject(toApiError(
        { message: "Session expired. Please retry your action." },
        "Session expired"
      ));
      return;
    }
    const tenant = getActiveTenant();
    config.headers = config.headers || {};
    if (nextAccess) config.headers.Authorization = `Bearer ${nextAccess}`;
    if (tenant?.id) config.headers["X-Tenant-ID"] = tenant.id;
    resolve(apiClient(config));
  });
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const requestConfig = error?.config || {};
    const requestUrl = String(requestConfig.url || "");

    if (status === 403) {
      clearActiveTenant();
      if (typeof window !== "undefined") window.location.href = "/select-account";
      return Promise.reject(toApiError(error, "Tenant access denied"));
    }

    if (status !== 401 || requestConfig._retry) {
      return Promise.reject(toApiError(error));
    }

    if (requestUrl.includes("/accounts/auth/refresh/")) {
      localStorage.clear();
      return Promise.reject(toApiError(error, "Session expired"));
    }

    requestConfig._retry = true;
    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      localStorage.clear();
      return Promise.reject(toApiError(error, "Session expired"));
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject, config: requestConfig });
      });
    }

    isRefreshing = true;
    try {
      const refreshResponse = await apiClient.post("/accounts/auth/refresh/", {
        refresh,
      });
      const nextAccess = String(refreshResponse?.data?.access || "").trim();
      if (!nextAccess) throw new Error("Missing refreshed access token");

      localStorage.setItem("token", nextAccess);
      localStorage.setItem("access_token", nextAccess);
      flushRefreshQueue(nextAccess, null);

      // Only auto-retry the original request if it's idempotent.
      if (!isIdempotent(requestConfig)) {
        return Promise.reject(
          toApiError(
            { message: "Session refreshed. Please retry your action." },
            "Session expired"
          )
        );
      }
      requestConfig.headers = requestConfig.headers || {};
      requestConfig.headers.Authorization = `Bearer ${nextAccess}`;
      return apiClient(requestConfig);
    } catch (refreshError) {
      flushRefreshQueue("", refreshError);
      localStorage.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(toApiError(refreshError, "Session expired"));
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
