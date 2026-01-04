import React, { useState, useRef } from "react";
import {
  Send,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import { sendCommunication } from "../../api/communications";
import "./ComposeBar.css";

/**
 * Unified Compose Bar for SMS + Email
 * - Uses Toastify for feedback
 * - Supports AI prefill
 * - Calls /api/comms/send/
 */
export default function ComposeBar({
  leadId,
  customerId,
  channel = "sms",
  aiSuggestion = "",
  onSent,
}) {
  const [body, setBody] = useState(aiSuggestion || "");
  const [sending, setSending] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(channel);
  const textareaRef = useRef(null);

  const handleSend = async () => {
    if (!body.trim()) {
      toast.warn("✍️ Type a message before sending.", { autoClose: 2500 });
      return;
    }

    setSending(true);
    try {
      const res = await sendCommunication({
        lead_id: leadId,
        customer_id: customerId,
        body,
        channel: selectedChannel,
      });

      if (res.success) {
        toast.success(
          selectedChannel === "sms"
            ? "📱 SMS sent successfully!"
            : "📧 Email sent successfully!",
          { autoClose: 2500 }
        );
        setBody("");
        textareaRef.current?.focus();
        onSent?.();
      } else {
        toast.error("⚠️ Message failed to send.");
      }
    } catch (err) {
      toast.error(`❌ Send error: ${err.message}`, { autoClose: 3000 });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="compose-bar">
      {/* 🔘 Channel Toggle */}
      <div className="compose-channel-toggle">
        <button
          className={selectedChannel === "sms" ? "active" : ""}
          onClick={() => setSelectedChannel("sms")}
          title="Text Message"
        >
          <MessageSquare size={18} />
        </button>
        <button
          className={selectedChannel === "email" ? "active" : ""}
          onClick={() => setSelectedChannel("email")}
          title="Email"
        >
          <Mail size={18} />
        </button>
      </div>

      {/* ✍️ Input */}
      <div className="compose-input">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedChannel === "sms"
              ? "Type a text message..."
              : "Write an email..."
          }
          rows={1}
        />
      </div>

      {/* ⚙️ Actions */}
      <div className="compose-actions">
        <button className="attach-btn" title="Attach File (coming soon)">
          <Paperclip size={18} />
        </button>

        {aiSuggestion && (
          <button
            className="ai-btn"
            title="Use AI Suggestion"
            onClick={() => setBody(aiSuggestion)}
          >
            <Sparkles size={18} />
          </button>
        )}

        <button
          className={`send-btn ${sending ? "sending" : ""}`}
          disabled={sending || !body.trim()}
          onClick={handleSend}
          title="Send Message"
        >
          {sending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}