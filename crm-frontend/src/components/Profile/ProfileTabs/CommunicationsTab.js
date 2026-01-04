// --------------------------------------------------------------
// CommunicationsTab.js (FINAL SAFE VERSION)
// --------------------------------------------------------------

import React, { useState, useEffect, useRef } from "react";
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
  return (
    <div className="gt-dir-badge">
      {msg.direction === "inbound" ? (
        <ArrowDownLeft size={13} color="#22c55e" />
      ) : (
        <ArrowUpRight size={13} color="#3b82f6" />
      )}

      {msg.channel === "email" ? (
        <span>Email</span>
      ) : msg.media_urls?.length > 0 ? (
        <span>MMS</span>
      ) : (
        <span>SMS</span>
      )}
    </div>
  );
}

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

  const cleanDigits = (p) => {
    if (!p) return null;
    const d = String(p).replace(/\D/g, "").slice(-10);
    return d.length === 10 ? d : null;
  };
  /* =============================================================
     AUTO-GROW TEXTAREA
  ============================================================ */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [draft]);

  /* =============================================================
     SCROLL TO TOP
  ============================================================ */
  const scrollToTop = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =============================================================
     LOAD MESSAGES
  ============================================================ */
  const loadMessages = async () => {
    if (!partyUID) return; // <-- prevents crash

    try {
      const params = { party_universal_id: partyUID };

      const [msgRes, callRes] = await Promise.all([
        api.get("/comms/thread/", { params }),
        api
          .get("/comms/calls/", { params })
          .catch(() => ({ data: { calls: [] } })),
      ]);

      let list = msgRes.data.messages || [];
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setMessages(list);
      setCalls(callRes.data.calls || []);

      requestAnimationFrame(scrollToTop);
    } catch (err) {
      toast.error("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partyUID) loadMessages();
  }, [partyUID]);

  /* =============================================================
     FIXED SAFE POLLING (NO CRASH)
  ============================================================ */
  useEffect(() => {
    if (!partyUID) return; // <-- prevents null-trigger crash

    const int = setInterval(() => loadMessages(), 3500);
    return () => clearInterval(int);
  }, [partyUID]);

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
          party_universal_id: partyUID,
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
      </div>

      {/* =======================================================
          THREAD
      ======================================================== */}
      <div className="gt-thread" ref={scrollRef}>
        {loading && <div className="loading-msg">Loading…</div>}

        {messages.map((m) => (
          <MessageCard msg={m} key={m.id} />
        ))}

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
  const inbound = msg.direction === "inbound";
  const isMMS = msg.media_urls?.length > 0;
  const ts = new Date(msg.timestamp);

  const statusIcon =
    msg.status === "delivered" ? (
      <CheckCircle size={14} className="text-green-400" />
    ) : msg.status === "failed" ? (
      <AlertTriangle size={14} className="text-red-500" />
    ) : (
      <Clock size={14} className="text-gray-400" />
    );

  return (
    <div className="gt-msg-card">
      <div className="gt-msg-header">
        <DirectionBadge msg={msg} />
        <span className="gt-msg-timestamp">{ts.toLocaleString()}</span>
        {statusIcon}
      </div>

      <div
        className="gt-msg-body"
        dangerouslySetInnerHTML={{ __html: msg.body }}
      />

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
