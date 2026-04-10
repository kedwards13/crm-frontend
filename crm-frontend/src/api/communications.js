// src/api/communications.js
import api, { normalizeArray } from "../apiClient";
import voiceClient, { registerWithVoiceService } from "./voiceClient";

let cachedVoiceToken = null;
const THREAD_LIST_PATHS = [
  "/communications/threads/",
  "/communications/threads",
  "/comms/threads/",
  "/comms/threads",
  "/comms/inbox/",
  "/comms/inbox",
  "/api/communications/threads/",
  "/api/comms/threads/",
  "/api/comms/inbox/",
];
const THREAD_MESSAGE_PATHS = (threadId) => [
  `/communications/threads/${encodeURIComponent(threadId)}/messages/`,
  `/communications/threads/${encodeURIComponent(threadId)}/messages`,
  `/comms/threads/${encodeURIComponent(threadId)}/messages/`,
  `/comms/threads/${encodeURIComponent(threadId)}/messages`,
  `/api/communications/threads/${encodeURIComponent(threadId)}/messages/`,
];
const THREAD_RESOLVE_PATHS = [
  "/comms/thread/",
  "/comms/thread",
  "/communications/thread/",
  "/communications/thread",
  "/api/comms/thread/",
  "/api/communications/thread/",
];
const SMS_SEND_PATHS = [
  "/communications/sms/send/",
  "/communications/sms/send",
  "/comms/send-sms/",
  "/comms/send-sms",
  "/comms/send/",
  "/comms/send",
  "/api/communications/sms/send/",
];

const normalizeCompatPath = (path) => {
  const candidate = String(path || "");
  const base = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  if (base.endsWith("/api") && candidate.startsWith("/api/")) {
    return candidate.replace(/^\/api/, "");
  }
  return candidate;
};

const getWithFallback = async (paths, config = {}) => {
  let lastError;
  for (const path of paths) {
    try {
      return await api.get(normalizeCompatPath(path), config);
    } catch (error) {
      if (error?.response?.status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("No compatible GET endpoint available.");
};

const postWithFallback = async (paths, payload = {}, config = {}) => {
  let lastError;
  for (const path of paths) {
    try {
      return await api.post(normalizeCompatPath(path), payload, config);
    } catch (error) {
      if (error?.response?.status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("No compatible POST endpoint available.");
};

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const normalizeBody = (value) => String(value ?? "").trim();
const HIDDEN_MESSAGE_STATUSES = new Set([
  "draft",
  "draft_suggested",
  "cancelled_error_campaign",
  "cancelled_manual_hold",
]);
const isRenderableMessage = (row = {}) => {
  const status = String(row?.status || "").trim().toLowerCase();
  return !HIDDEN_MESSAGE_STATUSES.has(status);
};
const looksLikeIdentifier = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const lowered = text.toLowerCase();
  if (
    lowered.startsWith("party:") ||
    lowered.startsWith("log:") ||
    lowered.startsWith("thread-") ||
    lowered.startsWith("legacy-") ||
    lowered.startsWith("conversation-")
  ) {
    return true;
  }
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text
    )
  ) {
    return true;
  }
  if (!text.includes(" ") && text.length >= 18 && /[a-z]/i.test(text) && /\d/.test(text)) {
    return true;
  }
  return false;
};

const pickDisplayName = (row = {}) => {
  const candidates = [
    row.display_name,
    row.contact_name,
    row.customer_name,
    row.lead_name,
    row.from,
  ];
  for (const candidate of candidates) {
    const cleaned = String(candidate ?? "").trim();
    if (cleaned && !looksLikeIdentifier(cleaned)) return cleaned;
  }
  return "";
};

const normalizeRowsFromCandidate = (candidate) => {
  if (Array.isArray(candidate)) return candidate;
  if (!candidate || typeof candidate !== "object") return [];
  if (Array.isArray(candidate.results)) return candidate.results;
  if (Array.isArray(candidate.items)) return candidate.items;
  if (Array.isArray(candidate.threads)) return candidate.threads;
  if (Array.isArray(candidate.data)) return candidate.data;
  return [];
};

const collectNestedArrays = (candidate, depth = 0) => {
  if (depth > 2 || !candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return [];
  }
  const arrays = [];
  for (const value of Object.values(candidate)) {
    if (Array.isArray(value)) {
      arrays.push(value);
      continue;
    }
    if (value && typeof value === "object") {
      arrays.push(...collectNestedArrays(value, depth + 1));
    }
  }
  return arrays;
};

const normalizeThreadRows = (payload) => {
  const rowCandidates = [
    normalizeRowsFromCandidate(payload?.threads),
    normalizeRowsFromCandidate(payload?.results),
    normalizeRowsFromCandidate(payload?.items),
    normalizeRowsFromCandidate(payload?.data),
    normalizeRowsFromCandidate(payload),
    ...collectNestedArrays(payload),
  ];
  const rows = rowCandidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0) || [];
  const normalizedRows = (rows.length ? rows : normalizeArray(payload || [])).filter(
    isRenderableMessage
  );

  return normalizedRows.map((row) => {
    const displayName = pickDisplayName(row);
    const fallbackContact =
      row?.contact_phone ||
      row?.phone ||
      row?.customer_phone ||
      row?.contact_email ||
      "Unknown contact";
    return {
      ...row,
      display_name: displayName,
      from: displayName || fallbackContact,
      contact_name: displayName || "",
      body: row?.body || row?.last_message || row?.last_message_body || "",
      timestamp:
        row?.timestamp ||
        row?.last_message_at ||
        row?.updated_at ||
        row?.created_at ||
        null,
    };
  });
};

const extractTargetParams = (targetOrLeadId, maybeCustomerId) => {
  const params = {};

  if (
    targetOrLeadId &&
    typeof targetOrLeadId === "object" &&
    !Array.isArray(targetOrLeadId)
  ) {
    const partyUID =
      targetOrLeadId.party_universal_id ??
      targetOrLeadId.partyUID ??
      targetOrLeadId.partyId ??
      targetOrLeadId.party_id;
    const threadId = targetOrLeadId.thread_id ?? targetOrLeadId.threadId;
    const contactPhone =
      targetOrLeadId.contact_phone ??
      targetOrLeadId.phone ??
      targetOrLeadId.customer_phone;
    const leadId = targetOrLeadId.lead_id ?? targetOrLeadId.leadId;
    const customerId = targetOrLeadId.customer_id ?? targetOrLeadId.customerId;

    if (hasValue(partyUID)) params.party_universal_id = partyUID;
    if (hasValue(threadId)) params.thread_id = threadId;
    if (hasValue(contactPhone)) params.contact_phone = contactPhone;
    if (hasValue(leadId)) params.lead_id = leadId;
    if (hasValue(customerId)) params.customer_id = customerId;
    return params;
  }

  if (hasValue(targetOrLeadId) && maybeCustomerId === undefined) {
    params.party_universal_id = targetOrLeadId;
    return params;
  }

  if (hasValue(targetOrLeadId)) params.lead_id = targetOrLeadId;
  if (hasValue(maybeCustomerId)) params.customer_id = maybeCustomerId;

  return params;
};

// Unified Inbox
export const fetchInboxMessages = async (filters = {}) => {
  let first404 = null;
  for (const path of THREAD_LIST_PATHS) {
    try {
      const response = await api.get(normalizeCompatPath(path), { params: filters });
      const rows = normalizeThreadRows(response.data);
      if (rows.length > 0) return rows;
    } catch (error) {
      if (error?.response?.status === 404) {
        first404 = first404 || error;
        continue;
      }
      throw error;
    }
  }
  if (first404) throw first404;
  return [];
};

export const fetchConversations = fetchInboxMessages;

// Thread (universal)
export const fetchThreadByTarget = async (targetOrLeadId, maybeCustomerId) => {
  const params = extractTargetParams(targetOrLeadId, maybeCustomerId);
  if (!Object.keys(params).length) return [];

  const rawThreadId = String(params.thread_id || "").trim();
  if (rawThreadId) {
    try {
      const byThread = await getWithFallback(THREAD_MESSAGE_PATHS(rawThreadId), { params });
      return normalizeArray(byThread.data?.messages || byThread.data || []).filter(
        isRenderableMessage
      );
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
    }
  }

  const res = await getWithFallback(THREAD_RESOLVE_PATHS, {
    params,
  });
  return normalizeArray(res.data?.messages || res.data || []).filter(isRenderableMessage);
};

export const fetchConversationMessages = fetchThreadByTarget;

// Smart AI Reply
export const fetchSmartReply = async (targetOrLeadId, maybeCustomerId) => {
  const params = extractTargetParams(targetOrLeadId, maybeCustomerId);
  if (!Object.keys(params).length) {
    return { reply: "", sentiment: "" };
  }

  const res = await api.get("/comms/smart-reply/", {
    params,
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
export const sendCommunication = async (payload = {}) => {
  const outboundPhone =
    payload.to_phone ||
    payload.toPhone ||
    payload.contact_phone ||
    payload.contactPhone;
  const outboundDigits =
    payload.contact_phone_digits || payload.contactPhoneDigits;
  const outboundEmail = payload.to_email || payload.toEmail;

  const body = normalizeBody(payload.body ?? payload.message ?? "");
  if (!body) {
    throw new Error("Message body is required");
  }

  const data = {
    body,
    channel: payload.channel || "sms",
    party_universal_id:
      payload.partyUID ||
      payload.party_universal_id ||
      payload.partyId ||
      payload.party_id,
    media_urls: payload.media_urls || [],
    lead_id: payload.lead_id ?? payload.leadId,
    customer_id: payload.customer_id ?? payload.customerId,
  };

  if (hasValue(outboundPhone)) {
    data.to_phone = outboundPhone;
    data.contact_phone = outboundPhone;
  }
  if (hasValue(outboundDigits)) data.contact_phone_digits = outboundDigits;
  if (hasValue(outboundEmail)) data.to_email = outboundEmail;
  if (hasValue(payload.subject)) data.subject = payload.subject;
  if (hasValue(payload.body_html)) data.body_html = payload.body_html;

  const res = await postWithFallback(SMS_SEND_PATHS, data);
  const result = res.data || {};
  return {
    ...result,
    status: result.status || result.delivery_status || "queued",
  };
};

export const sendSmsMessage = async (payload = {}) =>
  sendCommunication({
    ...payload,
    channel: "sms",
  });

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

export const startBrowserOutboundCall = async (payload = {}) => {
  const res = await postWithFallback(["/voice/call/connect", "/voice/call/connect/"], payload);
  return res.data || {};
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

export const createFollowUpTask = async (payload = {}) => {
  const res = await api.post("/tasks/", payload);
  return res.data || {};
};
