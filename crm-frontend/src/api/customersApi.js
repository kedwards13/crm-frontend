import api from "../apiClient";

// ✅ Use list_view for consistent CRM table data
export const getCustomers = (params = {}) =>
  api.get("/customers/list_view/", { params });

// ✅ Correct trailing slash for DRF
export const getCustomerMetrics = () => api.get("/customers/metrics/");

// Trigger enrichment on a single customer
export const enrichCustomer = (id, deep = false) =>
  api.post(`/customers/${id}/enrich/`, { deep });

// Bulk enrichment
export const enrichBulk = (ids = []) =>
  api.post("/customers/enrich_bulk/", { ids });

// Assign customers to a campaign
export const assignToCampaign = (campaignId, ids = []) =>
  api.post(`/campaigns/${campaignId}/assign_customers/`, { ids });

// Optional search helper
export const searchCustomers = (q) =>
  api.get("/customers/list_view/", { params: { q } });