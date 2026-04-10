import api from "../apiClient";

export const listPayments = (params = {}) => api.get("/payments/", { params });

// FieldRoutes invoices are exposed at /api/invoices/ (list view).
export const listInvoices = (params = {}) => api.get("/invoices/", { params });

