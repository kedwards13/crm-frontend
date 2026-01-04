import api from "../apiClient";

export const listCampaigns = () => api.get("/campaigns/");

export const createCampaign = (payload) => api.post("/campaigns/", payload);

export const runCampaign = (campaignId) =>
  api.post(`/campaigns/${campaignId}/run/`);

export const getCampaignAnalytics = (campaignId) =>
  api.get(`/campaigns/${campaignId}/analytics/`);
