import axios from 'axios';
import {
  clearActiveTenant,
  getActiveTenant,
  isTenantRequiredRequest,
  tenantSelectionRequiredError,
} from './helpers/tenantHelpers';

const aiApi = axios.create({
  baseURL: 'https://ai.abon.ai',
  withCredentials: false, // Not needed unless the AI service sets cookies
});

aiApi.interceptors.request.use((config) => {
  const tenant = getActiveTenant();
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  const needsTenant = isTenantRequiredRequest(config.url);

  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (needsTenant && !tenant?.id) {
    return Promise.reject(tenantSelectionRequiredError());
  }
  if (tenant?.id)       config.headers["X-Tenant-ID"] = tenant.id;
  if (tenant?.domain)   config.headers["X-Tenant-Domain"] = tenant.domain;
  if (tenant?.industry) config.headers["X-Tenant-Industry"] = tenant.industry;

  return config;
});

aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403) {
      clearActiveTenant();
    }
    return Promise.reject(error);
  }
);

export default aiApi;
