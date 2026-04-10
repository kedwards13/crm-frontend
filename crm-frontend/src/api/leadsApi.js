import api from "../apiClient";

const RETRYABLE_CODES = new Set(["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"]);

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableError = (error) => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  return !status || status >= 500 || RETRYABLE_CODES.has(code);
};

const withRetry = async (task, retries = 0, retryDelayMs = 250) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableError(error)) {
        throw error;
      }
      await sleep(retryDelayMs);
    }
  }

  throw lastError;
};

export const listCrmLeads = (params = {}) =>
  api.get("/leads/crm-leads/", { params });

export const getLeadPipeline = () =>
  api.get("/leads/pipeline/");

export const getCrmLead = (id) => api.get(`/leads/crm-leads/${id}/`);

export const getLeadAttribution = (id) => api.get(`/leads/${id}/attribution/`);

export const createCrmLead = (payload) => api.post("/leads/crm-leads/", payload);

export const updateCrmLead = (id, payload) =>
  api.patch(`/leads/crm-leads/${id}/`, payload);

export const archiveCrmLead = (id, payload = {}) =>
  api.patch(`/leads/crm-leads/${id}/`, { ...payload, archived: true });

export const spamCrmLead = (id, attributes = {}) =>
  api.patch(`/leads/crm-leads/${id}/`, {
    archived: true,
    attributes: { ...attributes, spam: true },
  });

export const updateLeadStage = (id, pipelineStage) =>
  // Keep board stage writes on the canonical PATCH endpoint with bounded retries. UI optimistic
  // state depends on this staying idempotent enough for transient network failures only.
  withRetry(
    () =>
      api.patch(
        `/leads/${id}/stage/`,
        { pipeline_stage: pipelineStage },
        { timeout: 10000 }
      ),
    2
  );

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
