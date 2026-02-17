// src/api/communications.js
import api, { normalizeArray } from "../apiClient";
import voiceClient, { registerWithVoiceService } from "./voiceClient";

let cachedVoiceToken = null;

// Unified Inbox
export const fetchInboxMessages = async (filters = {}) => {
  const res = await api.get("/comms/inbox/", { params: filters });
  return normalizeArray(res.data || []);
};

// Thread (universal)
export const fetchThreadByTarget = async (partyUID) => {
  const res = await api.get("/comms/thread/", {
    params: { party_universal_id: partyUID }
  });
  return normalizeArray(res.data?.messages || res.data || []);
};

// Smart AI Reply
export const fetchSmartReply = async (partyUID) => {
  const res = await api.get("/comms/smart-reply/", {
    params: { party_universal_id: partyUID }
  });
  return {
    reply: res.data?.reply || "",
    sentiment: res.data?.sentiment || "",
  };
};

// Update message (archive, read)
export const updateMessageStatus = async (logId, updates) => {
  const res = await api.patch(`/comms/update/${logId}/`, updates);
  return res.data;
};

// Send SMS/MMS/Email (universal)
export const sendCommunication = async (payload) => {
  const data = {
    body: payload.body,
    channel: payload.channel || "sms",
    party_universal_id: payload.partyUID,
    media_urls: payload.media_urls || [],
    lead_id: payload.lead_id,
    customer_id: payload.customer_id,
  };

  const res = await api.post("/comms/send/", data);
  return res.data;
};

// Voice call logs (by party, lead, customer, or phone)
export const fetchCallLogs = async (params = {}) => {
  const res = await api.get("/comms/calls/", { params });
  return normalizeArray(res.data || []);
};

// Single call detail (canonical source of truth)
export const fetchCallDetail = async (idOrSid) => {
  if (!idOrSid) return null;
  const res = await api.get(`/comms/calls/${idOrSid}/`);
  return res.data || null;
};

export const fetchVoiceClientToken = async (tenantId) => {
  const res = await api.post(
    "/voice/webrtc/register",
    {},
    tenantId
      ? {
          headers: { "X-Tenant-ID": tenantId },
        }
      : undefined
  );
  if (res?.status !== 200) {
    throw new Error("Failed to get voice client token");
  }
  const token = res?.data?.client_token;
  if (!token) {
    throw new Error("CRM did not return voice client token");
  }
  cachedVoiceToken = token;
  return token;
};

export const getVoiceClientToken = () => cachedVoiceToken;

export const registerVoiceDevice = async (clientToken, tenantId) => {
  console.log("[VOICE][DEBUG] registering with token:", clientToken?.slice(0, 40));
  try {
    const payload = JSON.parse(atob((clientToken || "").split(".")[1] || ""));
    console.log("[VOICE][DEBUG] token payload", payload);
  } catch {
    console.error("[VOICE][DEBUG] token is NOT a JWT");
  }
  if (!clientToken || !tenantId) {
    throw new Error("Missing voice client token or tenant id");
  }
  // tenantId is required for voice service auth; fetchVoiceClientToken caller should supply it.
  const res = await registerWithVoiceService(clientToken, tenantId);
  if (res?.status !== 200) {
    throw new Error("Voice service rejected registration");
  }
  return res.data || {};
};

// Outbound call (Voice service)
export const startOutboundCall = async (fromNumber, toNumber) => {
  const token = getVoiceClientToken();
  if (!token) throw new Error("Missing voice client token");
  const res = await voiceClient.post(
    "/voice/webrtc/call",
    {
      from_number: fromNumber,
      to_number: toNumber,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data || {};
};

export const startCrmOutboundCall = async () => {
  throw new Error("CRM outbound calls are disabled. Use Voice WebRTC endpoints.");
};

export const acceptVoiceCall = async (callId) => {
  const token = getVoiceClientToken();
  if (!token) throw new Error("Missing voice client token");
  const res = await voiceClient.post(
    "/voice/webrtc/accept",
    { call_id: callId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data || {};
};

export const rejectVoiceCall = async (callId) => {
  const token = getVoiceClientToken();
  if (!token) throw new Error("Missing voice client token");
  const res = await voiceClient.post(
    "/voice/webrtc/reject",
    { call_id: callId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data || {};
};

// Call wrap-up (CRM-owned)
export const wrapUpCall = async (callSid, payload) => {
  const res = await api.post(`/comms/calls/${callSid}/wrapup/`, payload);
  return res.data || {};
};
