import React, { useEffect, useState } from "react";
import {
  fetchInboxMessages,
  updateMessageStatus,
  fetchThreadMessages,
  fetchSmartReply,
} from "../../../api/communications";
import api from "../../../apiClient";
import AIInsightsPanel from "../AIInsightsPanel";
import CustomerPopup from "../../Profile/CustomerPopup";
import {
  Star,
  Archive,
  Reply,
  Plus,
  RefreshCcw,
  Search,
  Send,
  X,
} from "lucide-react";
import "./InboxPage.css";

export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [aiReply, setAiReply] = useState("");
  const [aiSentiment, setAiSentiment] = useState("");
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  // email form state
  const [toCustomer, setToCustomer] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);

  // fetch inbox
  useEffect(() => {
    fetchInboxMessages()
      .then((data) => {
        setMessages(data);
        setFiltered(data);
      })
      .finally(() => setLoading(false));
  }, []);

  // search customers dynamically
  useEffect(() => {
    const delay = setTimeout(() => {
      if (customerSearch.length > 1) {
        api
          .get(`/customers/?q=${customerSearch}`)
          .then((res) => setCustomerResults(res.data || []))
          .catch(() => setCustomerResults([]));
      } else {
        setCustomerResults([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [customerSearch]);

  const markAsRead = async (id) => {
    await updateMessageStatus(id, { is_read: true });
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
    );
  };

  const openMessage = async (msg) => {
    await markAsRead(msg.id);
    setSelectedMessage(msg);
    const thread = await fetchThreadMessages(msg.thread_id);
    setActiveThread(thread);

    try {
      const ai = await fetchSmartReply(msg.lead_id, msg.customer_id);
      setAiReply(ai.reply);
      setAiSentiment(ai.sentiment);
    } catch {
      setAiReply("AI unavailable.");
      setAiSentiment("neutral");
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setQuery(value);
    if (!value) return setFiltered(messages);
    setFiltered(
      messages.filter(
        (m) =>
          m.from?.toLowerCase().includes(value) ||
          m.subject?.toLowerCase().includes(value) ||
          m.body?.toLowerCase().includes(value)
      )
    );
  };

  const handleSendEmail = async () => {
    if (!toCustomer || !subject || !body) {
      alert("Please fill all email fields.");
      return;
    }
    try {
      const res = await api.post("/comms/email/send/", {
        to_email: toCustomer,
        subject,
        body_html: body,
      });
      if (res.data.success) {
        alert("✅ Email sent successfully.");
        setComposerOpen(false);
        setSubject("");
        setBody("");
        setToCustomer("");
      } else {
        alert("⚠️ Email failed to send.");
      }
    } catch (err) {
      alert("❌ Email send error: " + err.message);
    }
  };

  return (
    <div className="inbox-page two-column">
      <div className="inbox-list">
        {/* 🔍 Search + Quick Actions */}
        <div className="inbox-toolbar">
          <div className="search-group">
            <Search size={18} color="#999" />
            <input
              type="search"
              placeholder="Search messages, contacts, or keywords..."
              value={query}
              onChange={handleSearch}
            />
          </div>
          <div className="toolbar-actions">
            <button onClick={() => setComposerOpen(true)}>
              <Plus size={16} /> New
            </button>
            <button onClick={() => window.location.reload()}>
              <RefreshCcw size={16} /> Refresh
            </button>
          </div>
        </div>

        <h2>Unified Inbox</h2>

        {loading ? (
          <p>Loading messages...</p>
        ) : filtered.length === 0 ? (
          <p>No messages found.</p>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className={`inbox-item ${msg.is_read ? "read" : "unread"}`}
              onClick={() => openMessage(msg)}
            >
              <div className="meta">
                <strong>{msg.from}</strong> ·{" "}
                <span>{new Date(msg.timestamp).toLocaleString()}</span>
                <div className="msg-actions">
                  <button title="Star">
                    <Star size={15} />
                  </button>
                  <button title="Archive">
                    <Archive size={15} />
                  </button>
                  <button title="Reply">
                    <Reply size={15} />
                  </button>
                </div>
              </div>
              <div className="subject">{msg.subject || "No Subject"}</div>
              <div
                className="body"
                dangerouslySetInnerHTML={{ __html: msg.body }}
              />
            </div>
          ))
        )}
      </div>

      {/* 🔹 Right side: Thread + AI Panel + Customer Card */}
      {activeThread && selectedMessage && (
        <div className="inbox-preview">
          <h3>Conversation with {selectedMessage.from}</h3>
          <div className="thread-history scrollable">
            {activeThread.map((m) => (
              <div key={m.id} className={`msg-bubble ${m.direction}`}>
                <div className="meta">
                  {m.from} · {new Date(m.timestamp).toLocaleString()}
                </div>
                <div
                  className="body"
                  dangerouslySetInnerHTML={{ __html: m.body }}
                />
              </div>
            ))}
          </div>

          <AIInsightsPanel
            leadId={selectedMessage.lead_id}
            customerId={selectedMessage.customer_id}
            suggestedReply={aiReply}
            sentiment={aiSentiment}
            customerName={selectedMessage.from}
          />

          <CustomerPopup
            customerId={selectedMessage.customer_id}
            leadId={selectedMessage.lead_id}
            onCreateCustomer={() => console.log("Creating new customer...")}
          />
        </div>
      )}

      {/* ✉️ Inline Email Composer */}
      {composerOpen && (
        <div className="email-composer-overlay">
          <div className="email-composer">
            <div className="composer-header">
              <h3>New Email</h3>
              <button onClick={() => setComposerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="composer-field">
              <label>To</label>
              <input
                type="text"
                value={toCustomer}
                placeholder="Search customers..."
                onChange={(e) => {
                  setToCustomer(e.target.value);
                  setCustomerSearch(e.target.value);
                }}
              />
              {customerResults.length > 0 && (
                <div className="customer-dropdown">
                  {customerResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setToCustomer(c.primary_email);
                        setCustomerResults([]);
                      }}
                      className="dropdown-item"
                    >
                      {c.first_name} {c.last_name} — {c.primary_email} ({c.address})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="composer-field">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="composer-field">
              <label>Body</label>
              <textarea
                rows="6"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <button className="send-btn" onClick={handleSendEmail}>
              <Send size={16} /> Send Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}