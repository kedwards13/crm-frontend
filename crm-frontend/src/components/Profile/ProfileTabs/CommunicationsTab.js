// --------------------------------------------------------------
// CommunicationsTab.js (FINAL SAFE VERSION)
// --------------------------------------------------------------

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../../../apiClient";
import {
  Send,
  Bot,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";

import "./CommunicationsTab.css";

/* =============================================================
   Direction Badge
============================================================= */
function DirectionBadge({ msg }) {
  const isInbound = msg.direction === "inbound";
  const channelLabel =
    msg.channel === "email" ? "Email" : msg.media_urls?.length > 0 ? "MMS" : "SMS";

  return (
    <div className="gt-dir-badge">
      {isInbound ? (
        <ArrowDownLeft size={12} color="#9ca3af" />
      ) : (
        <ArrowUpRight size={12} color="#dbeafe" />
      )}
      <span>{channelLabel}</span>
    </div>
  );
}

const normalizeCallId = (call = {}) =>
  call.call_sid ||
  call.sid ||
  call.id ||
  `${call.from_number}-${call.to_number}-${call.created_at || call.timestamp}`;

const formatCallStatus = (status = "") => {
  const value = String(status || "").toLowerCase();
  if (!value) return "Unknown";
  if (value === "no-answer") return "No answer";
  return value.replace(/_/g, " ");
};

const formatCallDuration = (seconds) => {
  const total = Number(seconds || 0);
  if (!total) return "0s";
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return rem ? `${mins}m ${rem}s` : `${mins}m`;
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeMessage = (row = {}) => {
  const channel = row.channel === "email" ? "email" : row.media_urls?.length ? "mms" : "sms";
  const timestamp = row.timestamp || row.created_at || row.updated_at || null;
  const normalizedBody = stripHtml(row.body || row.body_html || row.preview || "");
  return {
    ...row,
    id: row.id || `${channel}-${timestamp || "message"}-${normalizedBody.slice(0, 24)}`,
    channel,
    body: row.body || row.body_html || row.preview || "",
    bodyText: normalizedBody,
    timestamp,
    direction: row.direction === "outbound" ? "outbound" : "inbound",
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
  };
};

/* =============================================================
   MAIN COMPONENT
============================================================= */
export default function CommunicationsTab({ lead, customer }) {
  const [messages, setMessages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [draft, setDraft] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [channel, setChannel] = useState("sms");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  /* =============================================================
     PARTY UID (UNBREAKABLE RESOLUTION)
  ============================================================ */
  const partyUID =
    lead?.universal_id ||
    lead?.raw?.universal_id ||
    customer?.universal_id ||
    customer?.raw?.universal_id ||
    null;
  const leadId = lead?.object === "lead" ? lead.id : null;
  const customerId =
    lead?.object === "customer"
      ? lead.id
      : lead?.object === "revival"
      ? lead.customer_id
      : customer?.id || customer?.customer_id || null;
  const hasIdentity = Boolean(partyUID || leadId || customerId);

  const cleanDigits = (p) => {
    if (!p) return null;
    const d = String(p).replace(/\D/g, "").slice(-10);
    return d.length === 10 ? d : null;
  };
  const sortedCalls = useMemo(() => {
    const rows = Array.isArray(calls) ? [...calls] : [];
    return rows.sort(
      (a, b) =>
        new Date(a.created_at || a.timestamp || 0) -
        new Date(b.created_at || b.timestamp || 0)
    );
  }, [calls]);
  const sortedMessages = useMemo(() => {
    const rows = Array.isArray(messages) ? [...messages] : [];
    return rows.sort(
      (a, b) =>
        new Date(a.timestamp || a.created_at || 0) -
        new Date(b.timestamp || b.created_at || 0)
    );
  }, [messages]);

  /* =============================================================
     AUTO-GROW TEXTAREA
  ============================================================ */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [draft]);

  /* =============================================================
     LOAD MESSAGES
  ============================================================ */
  const loadMessages = useCallback(async () => {
    if (!hasIdentity) return; // <-- prevents crash

    try {
      const params = {};
      if (partyUID) params.party_universal_id = partyUID;
      if (leadId) params.lead_id = leadId;
      if (customerId) params.customer_id = customerId;

      const [msgRes, callRes] = await Promise.all([
        api.get("/comms/thread/", { params }),
        api
          .get("/comms/calls/", { params })
          .catch(() => ({ data: { calls: [] } })),
      ]);

      const list = toArray(msgRes.data)
        .map(normalizeMessage)
        .filter((m) => m.channel === "sms" || m.channel === "mms" || m.channel === "email");

      const callRows = Array.isArray(callRes?.data)
        ? callRes.data
        : callRes?.data?.calls || callRes?.data?.results || [];

      setMessages(list);
      setCalls(callRows);

      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (err) {
      toast.error("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [hasIdentity, partyUID, leadId, customerId]);

  useEffect(() => {
    if (hasIdentity) loadMessages();
  }, [loadMessages, hasIdentity]);

  /* =============================================================
     FIXED SAFE POLLING (NO CRASH)
  ============================================================ */
  useEffect(() => {
    if (!hasIdentity) return; // <-- prevents null-trigger crash

    const int = setInterval(() => loadMessages(), 3500);
    return () => clearInterval(int);
  }, [loadMessages, hasIdentity]);

  /* =============================================================
     DETERMINE BEST SEND-TO PHONE
  ============================================================ */
  const getBestPhone = () => {
    // 1️⃣ If user has previously texted this party — ALWAYS use that number
    const lastOutbound = messages.find(
      (m) => m.direction === "outbound" && cleanDigits(m.contact_phone)
    );
    if (lastOutbound?.contact_phone) return lastOutbound.contact_phone;
  
    // 2️⃣ Full customer object (mapped)
    if (lead && lead.object === "customer") {
      const c = lead.raw || lead;
  
      const phones = [
        c.primary_phone,
        c.secondary_phone,
        ...(c.all_phones || []),
        c.phone,
      ]
        .map(cleanDigits)
        .filter(Boolean);
  
      if (phones.length > 0) return `+1${phones[0]}`;
    }
  
    // 3️⃣ Revival → always prefer customer_phone
    if (lead?.object === "revival") {
      const q = lead.raw || lead;
      const phones = [
        q.customer_phone,
        q.primary_phone,
        q.secondary_phone,
      ]
        .map(cleanDigits)
        .filter(Boolean);
  
      if (phones.length > 0) return `+1${phones[0]}`;
    }
  
    // 4️⃣ Lead
    if (lead?.primary_phone) {
      const d = cleanDigits(lead.primary_phone);
      if (d) return `+1${d}`;
    }
    if (lead?.raw?.primary_phone) {
      const d = cleanDigits(lead.raw.primary_phone);
      if (d) return `+1${d}`;
    }
    if (lead?.phone_number) {
      const d = cleanDigits(lead.phone_number);
      if (d) return `+1${d}`;
    }
    if (lead?.raw?.phone_number) {
      const d = cleanDigits(lead.raw.phone_number);
      if (d) return `+1${d}`;
    }
  
    // 5️⃣ Any remaining fallback
    const fallback = [
      lead?.raw?.primary_phone,
      lead?.raw?.secondary_phone,
      ...(lead?.raw?.all_phones || [])
    ]
      .map(cleanDigits)
      .filter(Boolean);
  
    if (fallback.length > 0) return `+1${fallback[0]}`;
  
    // ❌ last resort
    return null;
  };

  /* =============================================================
     SEND MESSAGE
  ============================================================ */
  const sendMessage = async () => {
    if (!draft.trim() && !mediaUrl) return;
    if (!leadId && !customerId) {
      return toast.error("No lead or customer linked.");
    }
  
    const sendTo = getBestPhone();
    if (!sendTo) return toast.error("No phone number available.");
  
    const digits = cleanDigits(sendTo); // <-- always 10 digits
    if (!digits) return toast.error("Invalid phone number format.");
  
    const formatted = `+1${digits}`; // <-- normalized outbound standard
  
    setSending(true);
  
    try {
      if (channel === "sms") {
        await api.post("/comms/send/", {
          channel: "sms",
          body: draft,
          media_urls: mediaUrl ? [mediaUrl] : [],
          ...(partyUID ? { party_universal_id: partyUID } : {}),
          lead_id: leadId || undefined,
          customer_id: customerId || undefined,

          // 🔥 FINAL CORRECT PAIR
          contact_phone: formatted,
          contact_phone_digits: digits,
        });
      } else {
        const toEmail =
          customer?.primary_email ||
          customer?.secondary_email ||
          lead?.primary_email ||
          lead?.raw?.primary_email ||
          lead?.email ||
          lead?.raw?.email ||
          null;
  
        if (!toEmail) return toast.error("No email available.");
  
        await api.post("/comms/email/send/", {
          to_email: toEmail,
          subject: "(Message from CRM)",
          body_html: draft,
          lead_id: leadId || undefined,
          customer_id: customerId || undefined,
        });
      }
  
      setDraft("");
      setMediaUrl("");
  
      toast.success("Message sent");
      loadMessages();
    } catch (err) {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  /* =============================================================
     AI SUGGESTION
  ============================================================ */
  const fetchAi = async () => {
    try {
      const res = await api.get("/comms/smart-reply/", {
        params: { party_universal_id: partyUID },
      });
      setAiReply(res.data.reply || "");
    } catch {
      toast.error("AI unavailable.");
    }
  };

  const createFollowUpTask = async () => {
    const taskLeadId =
      leadId ||
      messages.find((msg) => msg?.lead_id)?.lead_id ||
      null;
    if (!taskLeadId) {
      toast.info("Follow-up tasks require a linked lead.");
      return;
    }
    try {
      await api.post("/tasks/", {
        lead: taskLeadId,
        title: "Communication follow-up",
        description: draft || aiReply || "Follow up on customer communication thread.",
        task_type: "follow_up",
        status: "pending",
      });
      toast.success("Follow-up task created.");
    } catch {
      toast.error("Unable to create follow-up task.");
    }
  };

  /* =============================================================
     RENDER
  ============================================================ */
  return (
    <div className="gt-comms-panel">
      {/* =======================================================
          SEND BAR
      ======================================================== */}
      <div className="gt-comms-input-row">

        <textarea
          ref={textareaRef}
          rows={1}
          className="gt-comms-textarea"
          placeholder={channel === "sms" ? "Write an SMS…" : "Write an Email…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />

        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="Media URL"
          className="gt-media-url"
        />

        {mediaUrl && (
          <div className="gt-media-preview">
            <img src={mediaUrl} alt="media" />
            <span className="gt-media-remove" onClick={() => setMediaUrl("")}>
              ✕
            </span>
          </div>
        )}

        <button className="gt-send-btn" onClick={sendMessage} disabled={sending}>
          <Send size={16} />
        </button>

        <select
          className="gt-channel-select"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>

        <button className="gt-icon-btn" onClick={fetchAi}>
          <Bot size={16} />
        </button>

        <button className="gt-icon-btn" onClick={loadMessages}>
          <RefreshCw size={16} />
        </button>

        <button className="gt-icon-btn" onClick={createFollowUpTask} title="Create follow-up task">
          +Task
        </button>
      </div>

      {/* =======================================================
          THREAD
      ======================================================== */}
      <div className="gt-thread" ref={scrollRef}>
        {loading && <div className="loading-msg">Loading…</div>}

        {sortedMessages.map((m) => (
          <MessageCard msg={m} key={m.id} />
        ))}

        {sortedCalls.length > 0 && (
          <div className="gt-call-block">
            <div className="gt-call-block-title">Call Activity</div>
            {sortedCalls.map((call) => (
              <div className="gt-call-card" key={normalizeCallId(call)}>
                <div className="gt-call-card-top">
                  <span className="gt-call-direction">
                    {(call.direction || "call").toUpperCase()}
                  </span>
                  <span className="gt-msg-timestamp">
                    {new Date(call.created_at || call.timestamp || 0).toLocaleString()}
                  </span>
                </div>
                <div className="gt-call-route">
                  {call.from_number || "Unknown"} → {call.to_number || "Unknown"}
                </div>
                <div className="gt-call-meta">
                  {formatCallStatus(call.status)} •{" "}
                  {formatCallDuration(call.duration_seconds)}
                </div>
              </div>
            ))}
          </div>
        )}

        {aiReply && (
          <div className="gt-ai-suggestion">
            <strong>AI Suggestion:</strong> {aiReply}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================
   MESSAGE CARD
============================================================= */
function MessageCard({ msg }) {
  const isMMS = msg.channel === "mms" || msg.media_urls?.length > 0;
  const ts = new Date(msg.timestamp || msg.created_at || 0);
  const isOutbound = msg.direction === "outbound";
  const bubbleClass = isOutbound
    ? msg.channel === "email"
      ? "gt-msg-bubble outbound-email"
      : "gt-msg-bubble outbound"
    : "gt-msg-bubble inbound";

  const statusIcon =
    msg.status === "delivered" ? (
      <CheckCircle size={14} />
    ) : msg.status === "failed" ? (
      <AlertTriangle size={14} />
    ) : (
      <Clock size={14} />
    );

  return (
    <div className={`gt-msg-row ${isOutbound ? "outbound" : "inbound"}`}>
      <div className={bubbleClass}>
        <div className="gt-msg-body">{msg.bodyText || stripHtml(msg.body) || "No content"}</div>
        <div className="gt-msg-footer">
          <DirectionBadge msg={msg} />
          <span className="gt-msg-timestamp">{ts.toLocaleString()}</span>
          <span className="gt-msg-status">{statusIcon}</span>
        </div>
      </div>

      {isMMS && (
        <div className="gt-mms-wrap">
          {msg.media_urls.map((u) => (
            <img key={u} src={u} className="gt-mms-img" alt="mms" />
          ))}
        </div>
      )}
    </div>
  );
}
