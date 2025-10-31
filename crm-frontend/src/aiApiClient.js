import axios from 'axios';

const aiApi = axios.create({
  baseURL: 'https://ai.abon.ai',
  withCredentials: false, // Not needed unless the AI service sets cookies
});

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  const tenant = JSON.parse(localStorage.getItem("activeTenant") || "{}");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenant?.id)       config.headers["X-Tenant-ID"] = tenant.id;
  if (tenant?.domain)   config.headers["X-Tenant-Domain"] = tenant.domain;
  if (tenant?.industry) config.headers["X-Tenant-Industry"] = tenant.industry;

  return config;
});

export default aiApi;