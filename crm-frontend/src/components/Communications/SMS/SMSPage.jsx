import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Sparkles, Send, Users, RefreshCw, Inbox } from "lucide-react";
import { fetchThreadByTarget, fetchSmartReply, sendCommunication } from "../../../api/communications";
import MessageLog from "./MessageLog";
import "./SMSPage.css";

/**
 * SMS Messaging Hub
 * - View conversation threads
 * - Send 1:1 messages
 * - Mass send to lists of leads/customers/phone numbers
 * - AI suggestion assist
 */
const SMSPage = ({ leadId, customerId }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [channel] = useState("sms");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkLeadIds, setBulkLeadIds] = useState("");
  const [bulkCustomerIds, setBulkCustomerIds] = useState("");
  const smsTemplates = [
    { id: "confirm", name: "Appointment confirmation", body: "Hi {{name}}, your appointment is confirmed for {{date}} at {{time}}." },
    { id: "followup", name: "Lead follow-up", body: "Hi {{name}}, checking in about your inquiry. Reply YES to schedule." },
  ];
  const smsSequences = [
    { id: "reengage", name: "Re-engagement 3-step", steps: 3 },
    { id: "trial", name: "Trial nurture", steps: 4 },
  ];

  // 🔁 Fetch current conversation on mount
  useEffect(() => {
    loadThread();
    // eslint-disable-next-line
  }, [leadId, customerId]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const data = await fetchThreadByTarget(leadId, customerId);
      setMessages(data.reverse()); // oldest → newest
    } catch (e) {
      toast.error("Error loading messages.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return toast.warn("Type a message first.");
    try {
      const res = await sendCommunication({
        lead_id: leadId,
        customer_id: customerId,
        channel,
        body: message.trim(),
      });
      if (res?.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: res.log_id,
            direction: "outbound",
            body: message,
            timestamp: new Date().toISOString(),
          },
        ]);
        setMessage("");
        toast.success("📱 Message sent!");
      } else {
        toast.error("Failed to send message.");
      }
    } catch (e) {
      toast.error(`Send error: ${e.message}`);
    }
  };

  const handleAiSuggestion = async () => {
    setLoadingAi(true);
    try {
      const res = await fetchSmartReply(leadId, customerId);
      if (res.reply) {
        setAiSuggestion(res.reply);
        toast.info("🤖 Smart reply generated.");
      } else {
        toast.warn("No AI suggestion available.");
      }
    } catch (e) {
      toast.error("AI error fetching suggestion.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAcceptAi = async () => {
    if (!aiSuggestion) return;
    setMessage(aiSuggestion);
    setAiSuggestion("");
    toast.success("AI suggestion added to composer.");
  };

  const parseList = (raw = "") =>
    Array.from(
      new Set(
        raw
          .split(/[\n,]+/)
          .map((v) => v.trim())
          .filter(Boolean)
      )
    );

  const normalizeToE164 = (input = "") => {
    const digits = input.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (input.startsWith("+") && input.length > 1) return input;
    return "";
  };

  const handleMassSend = async () => {
    const numbers = parseList(bulkNumbers)
      .map(normalizeToE164)
      .filter(Boolean);
    const leads = parseList(bulkLeadIds);
    const customers = parseList(bulkCustomerIds);

    if (!message.trim()) return toast.warn("Enter a message to send.");
    if (numbers.length === 0 && leads.length === 0 && customers.length === 0) {
      return toast.warn("Add at least one recipient.");
    }

    try {
      const jobs = [];

      numbers.forEach((num) =>
        jobs.push(
          sendCommunication({
            body: message.trim(),
            channel: "sms",
            to_phone: num,
          })
        )
      );

      leads.forEach((id) =>
        jobs.push(
          sendCommunication({
            body: message.trim(),
            channel: "sms",
            lead_id: id,
          })
        )
      );

      customers.forEach((id) =>
        jobs.push(
          sendCommunication({
            body: message.trim(),
            channel: "sms",
            customer_id: id,
          })
        )
      );

      await Promise.all(jobs);
      toast.success(`Sent to ${jobs.length} recipients.`);
    } catch (err) {
      toast.error("Mass send failed.");
    }
  };

  const audienceSummary = useMemo(() => {
    const n = parseList(bulkNumbers).filter((v) => normalizeToE164(v)).length;
    const l = parseList(bulkLeadIds).length;
    const c = parseList(bulkCustomerIds).length;
    return `${n} numbers • ${l} leads • ${c} customers`;
  }, [bulkCustomerIds, bulkLeadIds, bulkNumbers]);

  return (
    <div className="sms-page">
      <div className="sms-header">
        <div>
          <p className="eyebrow">Messaging</p>
          <h2>SMS</h2>
        </div>
        <button onClick={loadThread} className="icon-btn" title="Refresh thread">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 🧠 AI Suggestion */}
      <div className="ai-tools">
        <button
          onClick={handleAiSuggestion}
          className={`secondary-button ${loadingAi ? "loading" : ""}`}
          disabled={loadingAi}
        >
          {loadingAi ? (
            <>
              <Loader2 className="spin" size={14} /> AI Thinking…
            </>
          ) : (
            <>
              <Sparkles size={14} /> Get AI Suggestion
            </>
          )}
        </button>

        {aiSuggestion && (
          <div className="ai-suggestion-box">
            <p>{aiSuggestion}</p>
            <div className="ai-buttons">
              <button onClick={handleAcceptAi} className="accept-btn">
                Use
              </button>
              <button onClick={() => setAiSuggestion("")} className="deny-btn">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 💬 Conversation */}
      <div className="conversation-container">
        {loading ? (
          <div className="loading">
            <Loader2 className="spin" /> Loading conversation...
          </div>
        ) : (
          <MessageLog messages={messages} title="Conversation History" />
        )}
      </div>

      <div className="sms-grid">
        {/* ✍️ Composer */}
        <div className="composer card">
          <div className="composer-header">
            <Inbox size={16} />
            <span>New message</span>
          </div>
          <textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <div className="composer-actions">
            <button onClick={handleSend} className="action-button">
              <Send size={16} /> Send
            </button>
          </div>
        </div>

        {/* 📣 Mass texting */}
        <div className="card mass-card">
          <div className="composer-header">
            <Users size={16} />
            <span>Mass text</span>
            <div className="pill">{audienceSummary}</div>
          </div>
          <label>Phone numbers (one per line or comma)</label>
          <textarea
            rows={2}
            value={bulkNumbers}
            onChange={(e) => setBulkNumbers(e.target.value)}
            placeholder="+15551234567, 4025550123"
          />

          <div className="grid-2">
            <div>
              <label>Lead IDs</label>
              <textarea
                rows={2}
                value={bulkLeadIds}
                onChange={(e) => setBulkLeadIds(e.target.value)}
                placeholder="12, 44, 55"
              />
            </div>
            <div>
              <label>Customer IDs</label>
              <textarea
                rows={2}
                value={bulkCustomerIds}
                onChange={(e) => setBulkCustomerIds(e.target.value)}
                placeholder="21, 22"
              />
            </div>
          </div>

          <div className="composer-actions">
            <button onClick={handleMassSend} className="group-button">
              <Users size={16} /> Send to list
            </button>
          </div>
        </div>
      </div>

      {/* Templates & sequences */}
      <div className="sms-grid">
        <div className="card">
          <div className="composer-header">
            <Sparkles size={16} />
            <span>Templates</span>
          </div>
          {smsTemplates.map((tpl) => (
            <div key={tpl.id} className="template-row">
              <div>
                <div className="template-title">{tpl.name}</div>
                <div className="muted tiny">{tpl.body}</div>
              </div>
              <button
                className="pill-btn"
                type="button"
                onClick={() => setMessage(tpl.body)}
              >
                Use
              </button>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="composer-header">
            <Users size={16} />
            <span>Sequences</span>
          </div>
          {smsSequences.map((seq) => (
            <div key={seq.id} className="template-row">
              <div>
                <div className="template-title">{seq.name}</div>
                <div className="muted tiny">{seq.steps} steps</div>
              </div>
              <button className="pill-btn ghost" type="button">
                Preview
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SMSPage;
