import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Sparkles, Send, Users, RefreshCw } from "lucide-react";
import {
  fetchThreadByTarget,
  fetchSmartReply,
  sendCommunication,
} from "../../../api/communications";
import MessageLog from "./MessageLog";
import "./SMSPage.css";

/**
 * SMSPage
 * Full-featured AI + SMS Messaging Hub
 * - View conversation threads
 * - Send / receive messages
 * - Generate AI follow-ups
 * - Support group messages (multi-select recipients)
 */
const SMSPage = ({ leadId, customerId }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]); // For future group SMS
  const [channel] = useState("sms");

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

  const handleMassSend = async () => {
    if (selectedRecipients.length === 0 || !message.trim())
      return toast.warn("Select recipients and enter a message.");

    try {
      const promises = selectedRecipients.map((r) =>
        sendCommunication({
          customer_id: r.id,
          channel: "sms",
          body: message,
        })
      );
      await Promise.all(promises);
      toast.success(`Sent to ${selectedRecipients.length} recipients.`);
    } catch (err) {
      toast.error("Mass send failed.");
    }
  };

  return (
    <div className="sms-page">
      <div className="sms-header">
        <h2>📨 SMS Messaging Hub</h2>
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

      {/* ✍️ Composer */}
      <div className="composer">
        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
        />
        <div className="composer-actions">
          <button onClick={handleSend} className="action-button">
            <Send size={16} /> Send
          </button>
          <button onClick={handleMassSend} className="group-button">
            <Users size={16} /> Group Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SMSPage;