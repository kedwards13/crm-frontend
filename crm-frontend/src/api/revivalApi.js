// src/api/revivalApi.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE;

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach JWT and tenant headers
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenant = JSON.parse(localStorage.getItem('activeTenant') || '{}');

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenant?.id) config.headers['X-Tenant-ID'] = tenant.id;
  if (tenant?.domain) config.headers['X-Tenant-Domain'] = tenant.domain;
  if (tenant?.industry) config.headers['X-Tenant-Industry'] = tenant.industry;

  return config;
});

// 🔁 Revival API
const revivalApi = {
  // 📄 Quote CRUD
  listQuotes: () => apiClient.get('/revival/'),
  createQuote: (data) => apiClient.post('/revival/', data),
  getQuote: (uuid) => apiClient.get(`/revival/${uuid}/`),
  updateQuote: (uuid, data) => apiClient.put(`/revival/${uuid}/`, data),
  deleteQuote: (uuid) => apiClient.delete(`/revival/${uuid}/`),

  // ✅ Actions (accept / reject / convert)
  acceptQuote: (uuid) => apiClient.post(`/revival/${uuid}/accept/`),
  rejectQuote: (uuid) => apiClient.post(`/revival/${uuid}/reject/`),
  convertQuote: (uuid) => apiClient.post(`/revival/${uuid}/convert/`),

  // ✍️ Submit Review
  submitReview: (uuid, data = {}) => apiClient.patch(`/revival/${uuid}/submit-review/`, data),

  // 📤 File Upload
  uploadScanFile: (uuid, formData) =>
    apiClient.post(`/revival/${uuid}/upload-scan/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // 🔄 Scanner Save
  saveScannedQuote: (data) => apiClient.post('/revival/scanner/save/', data),

  // 📊 Metrics + Summary
  getOverview: () => apiClient.get('/revival/scanner/overview/'),
  getSummary: () => apiClient.get('/revival/scanner/summary/'),
  getPaymentSummary: () => apiClient.get('/revival/scanner/payment-summary/'),
  getInsights: () => apiClient.get('/revival/scanner/insights/'),

  // 📁 Recent Scans
  getRecentScans: () => apiClient.get('/revival/scanner/recent/'),

  // 💸 Payment Filters
  getPaidQuotes: () => apiClient.get('/revival/scanner/paid/'),
  getPartiallyPaidQuotes: () => apiClient.get('/revival/scanner/partial/'),
  getUnpaidQuotes: () => apiClient.get('/revival/scanner/unpaid/'),
};

export default revivalApi;