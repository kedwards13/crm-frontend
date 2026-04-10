import api from "../apiClient";

// FieldRoutes operational universe (read-only, paginated DRF format)
// { count, next, previous, results }
export const listOperationalCustomers = (params = {}) =>
  api.get("/operations/customers/", { params });

export const getOperationalCustomerMetrics = (params = {}) =>
  api.get("/operations/customers/metrics/", { params });

export const getOperationalCustomer = (fieldroutesCustomerId) =>
  api.get(`/operations/customers/${fieldroutesCustomerId}/`);

export const listOperationalCustomerServicePlans = (fieldroutesCustomerId, params = {}) =>
  api.get(`/operations/customers/${fieldroutesCustomerId}/service-plans/`, { params });

export const listOperationalCustomerAppointments = (fieldroutesCustomerId, params = {}) =>
  api.get(`/operations/customers/${fieldroutesCustomerId}/appointments/`, { params });

export const listOperationalCustomerPayments = (fieldroutesCustomerId, params = {}) =>
  api.get(`/operations/customers/${fieldroutesCustomerId}/payments/`, { params });

