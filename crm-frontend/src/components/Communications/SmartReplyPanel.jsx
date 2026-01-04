import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw, Send, ClipboardCopy, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchSmartReply,
  fetchThreadByTarget,
  sendCommunication,
} from "../../api/communications";
import "./SmartReplyPanel.css";

/**
 * SmartReplyPanel
 * - Fetches /api/comms/smart-reply/ (Django → FastAPI)
 * - Displays sentiment + suggested reply
 * - Lets user copy, use, or send AI suggestions instantly
 *
 * Props:
 *  - leadId / customerId: identify conversation
 *  - channel: "sms" | "email"
 *  - onUse: (text) => void — inserts suggestion into ComposeBar
 *  - autoLoad: fetch suggestion immediately on mount
 */
export default function SmartReplyPanel({
  leadId,
  customerId,
  channel = "sms",
  onUse,
  autoLoad = true,
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [threadPreview, setThreadPreview] = useState([]);
  const [sending, setSending] = useState(false);

  const target = useMemo(
    () => ({ lead_id: leadId, customer_id: customerId }),
    [leadId, customerId]
  );

  // 🔁 Load message thread + smart reply
  const load = async () => {
    setLoading(true);
    try {
      const thread = await fetchThreadByTarget(leadId, customerId);
      setThreadPreview(thread.slice(-5)); // last 5 messages

      const res = await fetchSmartReply(leadId, customerId);
      if (res?.reply) setSuggestion(res.reply);
      if (res?.sentiment) setSentiment(res.sentiment);
    } catch (e) {
      toast.error(`Smart Reply error: ${e.message}`, { autoClose: 2500 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, customerId]);

  // 🧠 Insert into composer
  const handleUse = () => {
    if (!suggestion.trim()) return;
    onUse?.(suggestion.trim());
    toast.success("Inserted AI suggestion into composer.", { autoClose: 1800 });
  };

  // 📋 Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion || "");
      toast.info("Copied to clipboard.", { autoClose: 1500 });
    } catch {
      toast.error("Copy failed.", { autoClose: 1800 });
    }
  };

  // 📤 Send instantly
  const handleSendNow = async () => {
    if (!suggestion.trim()) {
      toast.warn("Nothing to send.", { autoClose: 1800 });
      return;
    }
    setSending(true);
    try {
      const payload = {
        lead_id: leadId,
        customer_id: customerId,
        channel,
        body: suggestion.trim(),
      };
      const res = await sendCommunication(payload);
      if (res?.success) {
        toast.success("✅ Sent successfully!", { autoClose: 1500 });
      } else {
        toast.error("Send failed.", { autoClose: 2000 });
      }
    } catch (e) {
      toast.error(`Send error: ${e.message}`, { autoClose: 2500 });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="smart-panel">
      {/* Header */}
      <div className="smart-panel__header">
        <div className="smart-title">
          <Sparkles size={16} />
          <span>Smart Reply</span>
        </div>

        <div className="smart-actions">
          <button
            className="icon-btn"
            onClick={load}
            title="Refresh suggestion"
            disabled={loading}
          >
            {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      {/* Message context preview */}
      {threadPreview?.length > 0 && (
        <div className="smart-thread">
          {threadPreview.map((m) => (
            <div
              key={m.id}
              className={`smart-msg ${m.direction === "inbound" ? "in" : "out"}`}
              title={`${m.direction.toUpperCase()} • ${new Date(
                m.timestamp
              ).toLocaleString()}`}
            >
              <div className="smart-msg__body">{m.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sentiment pill */}
      {sentiment && (
        <div className={`sentiment sentiment--${sentiment.toLowerCase()}`}>
          {sentiment}
        </div>
      )}

      {/* AI Suggestion editor */}
      <div className="smart-editor">
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="AI will suggest a reply here…"
          rows={5}
        />
      </div>

      {/* Footer actions */}
      <div className="smart-footer">
        <div className="left">
          <button className="ghost" onClick={handleCopy} title="Copy">
            <ClipboardCopy size={16} />
            Copy
          </button>
          <span className="hint">Channel: {channel.toUpperCase()}</span>
        </div>

        <div className="right">
          <button className="secondary" onClick={handleUse}>
            Use in Composer
          </button>
          <button
            className="primary"
            onClick={handleSendNow}
            disabled={sending || !suggestion.trim()}
            title="Send now"
          >
            {sending ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}