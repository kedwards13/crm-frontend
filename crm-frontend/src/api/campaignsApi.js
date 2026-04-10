import api from "../apiClient";

export const listCampaigns = () => api.get("/campaigns/");

export const createCampaign = (payload) => api.post("/campaigns/", payload);

export const getCampaign = (campaignId) => api.get(`/campaigns/${campaignId}/`);

export const runCampaign = (campaignId) =>
  api.post(`/campaigns/${campaignId}/run/`);

export const getCampaignAnalytics = (campaignId) =>
  api.get(`/campaigns/${campaignId}/analytics/`);

export const getCampaignPerformance = () => api.get("/campaigns/performance/");

export const getCampaignRecipients = (campaignId) =>
  api.get(`/campaigns/${campaignId}/recipients/`);

export const getCampaignPreview = (campaignId, params = {}) =>
  api.get(`/campaigns/${campaignId}/preview/`, { params });

export const getCampaignStats = (campaignId) =>
  api.get(`/campaigns/${campaignId}/stats/`);

export const updateCampaign = (campaignId, payload) =>
  api.patch(`/campaigns/${campaignId}/`, payload);

export const pauseCampaign = (campaignId) =>
  api.post(`/campaigns/${campaignId}/pause/`);

export const sendCampaignWithOverrides = (campaignId, payload) =>
  api.post(`/campaigns/${campaignId}/send/?sync=1`, payload);

export const autoEnrollCampaign = (payload) =>
  api.post("/campaigns/auto-enroll/", payload);

export const optimizeCampaignMessage = async (payload = {}) => {
  const message = String(payload?.message || "").trim();
  const goal = String(payload?.goal || "").trim();
  const channel = String(payload?.channel || "sms").trim().toLowerCase() || "sms";
  const query = [
    "Optimize this approved campaign draft for clarity and response quality.",
    `Channel: ${channel}.`,
    goal ? `Goal: ${goal}.` : "",
    `Base message: ${message}`,
    "Return only the revised message body.",
  ]
    .filter(Boolean)
    .join(" ");

  const response = await api.post("/assistant/query/", {
    query,
    context: "campaign_message_optimize",
  });

  const optimized =
    String(response?.data?.response || response?.data?.message || "").trim() || message;

  return {
    ...response,
    data: {
      ...(response?.data || {}),
      message: optimized,
    },
  };
};
