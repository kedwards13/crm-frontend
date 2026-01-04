// src/api/communications.js
import api from "../apiClient";

// Unified Inbox
export const fetchInboxMessages = async (filters = {}) => {
  const res = await api.get("/comms/inbox/", { params: filters });
  return res.data || [];
};

// Thread (universal)
export const fetchThreadByTarget = async (partyUID) => {
  const res = await api.get("/comms/thread/", {
    params: { party_universal_id: partyUID }
  });
  return res.data?.messages || [];
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
  return res.data || {};
};
