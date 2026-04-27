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
  const industry = String(payload?.industry || "").trim();
  const audienceGroup = String(payload?.audienceGroup || "").trim();
  const serviceType = String(payload?.serviceType || "").trim();
  const tone = String(payload?.tone || "friendly").trim();
  const companyName = String(payload?.companyName || "").trim();
  const companyPhone = String(payload?.companyPhone || "").trim();

  const query = [
    "You are writing SMS campaign messages for a field service business.",
    `Channel: ${channel}. Max 160 characters preferred for SMS.`,
    industry ? `Industry: ${industry}.` : "",
    companyName ? `Company: ${companyName}.` : "",
    audienceGroup ? `Audience: ${audienceGroup}.` : "",
    serviceType ? `Service type: ${serviceType}.` : "",
    goal ? `Campaign goal: ${goal}.` : "",
    `Tone: ${tone}.`,
    `Base message to improve: ${message}`,
    "",
    "Rules:",
    '- Do NOT invent discounts, offers, prices, or URLs the business has not provided.',
    '- Do NOT add booking links or scheduling URLs.',
    '- Include "Reply STOP to opt out" at the end.',
    '- Use {first_name} for personalization if appropriate.',
    companyPhone ? `- Company phone for callbacks: ${companyPhone}.` : "",
    '- Keep it human, not robotic.',
    "",
    "Return exactly 3 variants separated by ---:",
    "Variant 1: Short (under 100 chars + STOP text)",
    "Variant 2: Friendly conversational (under 160 chars + STOP text)",
    "Variant 3: Direct with clear CTA (under 160 chars + STOP text)",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await api.post("/assistant/query/", {
    query,
    context: "campaign_message_optimize",
  });

  const raw = String(response?.data?.response || response?.data?.message || "").trim();

  // Parse 3 variants if separator found
  const variants = raw.includes("---")
    ? raw.split(/\s*---\s*/).map((v) => v.trim()).filter(Boolean)
    : [raw];

  return {
    ...response,
    data: {
      ...(response?.data || {}),
      message: variants[0] || message,
      variants,
    },
  };
};
