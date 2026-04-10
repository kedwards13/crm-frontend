import api from "../apiClient";

// Paginated list (preferred for large datasets)
// Expected DRF format: { count, next, previous, results }
export const listCustomers = (params = {}) => api.get("/customers/", { params });

// Backwards-compatible alias (older code used getCustomers)
export const getCustomers = (params = {}) => listCustomers(params);

// Legacy list_view (non-paginated, can be expensive on large tenants)
export const getCustomersListView = (params = {}) =>
  api.get("/customers/list_view/", { params });

export const getCustomer = (id) => api.get(`/customers/${id}/`);

// ✅ Correct trailing slash for DRF
export const getCustomerMetrics = () => api.get("/customers/metrics/");

// Trigger enrichment on a single customer
export const enrichCustomer = (id, deep = false) =>
  api.post(`/customers/${id}/enrich/`, { deep });

// Bulk enrichment
export const enrichBulk = (ids = []) =>
  api.post("/customers/enrich_bulk/", { ids });

// Assign customers to a campaign
export const assignToCampaign = async (campaignId, ids = []) => {
  const customerIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!campaignId || !customerIds.length) return { enrolled: 0, results: [] };
  const results = await Promise.all(
    customerIds.map((customerId) =>
      api
        .post("/campaigns/auto-enroll/", { campaign_id: campaignId, customer_id: customerId })
        .then((res) => res.data)
        .catch((error) => ({
          customer_id: customerId,
          error: error?.response?.data?.detail || error?.message || "Enrollment failed",
        }))
    )
  );
  return { enrolled: results.filter((row) => !row?.error).length, results };
};

// Update customer (partial update)
export const updateCustomer = (id, data) => api.patch(`/customers/${id}/`, data);

// Optional search helper (paginated)
export const searchCustomers = (search) =>
  listCustomers({ search, page: 1, page_size: 50 });
