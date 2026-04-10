import api from './client';

const toResults = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const revivalApi = {
  listQuotes: (params = {}) => api.get('/revival/', { params }),
  createQuote: (data) => api.post('/revival/', data),
  getQuote: (uuid) => api.get(`/revival/${uuid}/`),
  updateQuote: (uuid, data) => api.put(`/revival/${uuid}/`, data),
  deleteQuote: (uuid) => api.delete(`/revival/${uuid}/`),

  acceptQuote: (uuid) => api.post(`/revival/${uuid}/accept/`),
  rejectQuote: (uuid) => api.post(`/revival/${uuid}/reject/`),
  convertQuote: (uuid) => api.post(`/revival/${uuid}/convert/`),
  submitReview: (uuid, data = {}) => api.patch(`/revival/${uuid}/submit-review/`, data),

  uploadScanFile: (uuid, formData) =>
    api.post(`/revival/${uuid}/upload-scan/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  saveScannedQuote: (data) => api.post('/revival/scanner/save/', data),

  getOverview: () => api.get('/revival/scanner/overview/'),
  parseScan: (data = {}) => api.post('/revival/scanner/parse/', data),
  getEligible: () => api.get('/revival/eligible/'),
  getSummary: () => api.get('/revival/scanner/summary/'),
  getPaymentSummary: () => api.get('/revival/scanner/payment-summary/'),
  getInsights: () => api.get('/revival/scanner/insights/'),
  getRecentScans: (params = {}) => api.get('/revival/scanner/recent/', { params }),
  getPaidQuotes: () => api.get('/revival/scanner/paid/'),
  getPartiallyPaidQuotes: () => api.get('/revival/scanner/partial/'),
  getUnpaidQuotes: () => api.get('/revival/scanner/unpaid/'),
  triggerRevival: (data = {}) => api.post('/revival/trigger/', data),

  // Legacy helper used by planner surfaces.
  getTotalPotentialValue: async () => {
    const summaryRes = await api.get('/revival/scanner/summary/');
    const summary = summaryRes?.data || {};
    const summaryTotal = Number(summary.total_scanned_value || summary.total_potential_value || 0);
    if (Number.isFinite(summaryTotal) && summaryTotal > 0) {
      return {
        data: {
          total_potential_value: summaryTotal,
        },
      };
    }
    const quotesRes = await api.get('/revival/scanner/recent/', { params: { limit: 25 } });
    const quotes = toResults(quotesRes?.data);
    const fallbackTotal = quotes.reduce((acc, item) => {
      const raw =
        item?.estimated_total ??
        item?.quote_total ??
        item?.total ??
        item?.amount ??
        0;
      const value = Number(raw);
      return acc + (Number.isFinite(value) ? value : 0);
    }, 0);
    return {
      data: {
        total_potential_value:
          Number(summary.total_scanned_value || summary.total_potential_value) || fallbackTotal,
      },
    };
  },
};

export default revivalApi;
