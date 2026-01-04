import api from "../apiClient";

export const listCrmLeads = (params = {}) =>
  api.get("/leads/crm-leads/", { params });

export const getCrmLead = (id) => api.get(`/leads/crm-leads/${id}/`);

export const createCrmLead = (payload) => api.post("/leads/crm-leads/", payload);

export const updateCrmLead = (id, payload) =>
  api.patch(`/leads/crm-leads/${id}/`, payload);

export const listWebLeads = (params = {}) =>
  api.get("/leads/web-leads/", { params });

export const archiveWebLead = (webLeadId) =>
  api.post(`/leads/web/${webLeadId}/archive/`);

export const spamWebLead = (webLeadId) =>
  api.post(`/leads/web/${webLeadId}/spam/`);

export const transferLead = (payload) => {
  if (typeof payload === "number") {
    return api.post("/leads/transfer-lead/", { lead_id: payload });
  }
  return api.post("/leads/transfer-lead/", payload || {});
};
