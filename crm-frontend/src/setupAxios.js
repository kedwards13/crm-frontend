import axios from 'axios';
import { API_BASE_URL } from './config/env';
import {
  clearActiveTenant,
  getActiveTenant,
  tenantSelectionRequiredError,
} from './helpers/tenantHelpers';

/**
 * Global axios interceptors for modules that import the default axios instance.
 * Ensures auth + tenant headers are attached and blocks protected calls
 * when the tenant context is missing.
 */
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 15000;

const TENANT_OPTIONAL_PATHS = [
  '/accounts/auth/login/',
  '/accounts/auth/refresh/',
  '/accounts/auth/switch-tenant/',
  '/accounts/tenant-signup/',
];

const requiresTenant = (url = '') =>
  !TENANT_OPTIONAL_PATHS.some((path) => url?.includes(path));

axios.interceptors.request.use((config) => {
  const tenant = getActiveTenant();
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const needsTenant = requiresTenant(config.url);

  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (needsTenant && !tenant?.id) {
    return Promise.reject(tenantSelectionRequiredError());
  }
  if (tenant?.id) config.headers['X-Tenant-ID'] = tenant.id;
  if (tenant?.domain) config.headers['X-Tenant-Domain'] = tenant.domain;
  if (tenant?.industry) config.headers['X-Tenant-Industry'] = tenant.industry;

  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403) {
      clearActiveTenant();
      window.location.href = '/select-account';
    }
    if (error?.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const tenant = getActiveTenant();
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const needsTenant = requiresTenant(url);

    if (needsTenant && !tenant?.id) {
      return Promise.reject(tenantSelectionRequiredError());
    }

    const headers = new Headers(
      init?.headers || (typeof input !== 'string' ? input?.headers : undefined) || {}
    );

    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    if (tenant?.id) headers.set('X-Tenant-ID', tenant.id);
    if (tenant?.domain) headers.set('X-Tenant-Domain', tenant.domain);
    if (tenant?.industry) headers.set('X-Tenant-Industry', tenant.industry);

    const nextInit = { ...init, headers };
    const response = await originalFetch(input, nextInit);
    if (response?.status === 403) {
      clearActiveTenant();
    }
    return response;
  };
}
