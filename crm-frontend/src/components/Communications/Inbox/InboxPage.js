import React, { useEffect, useState } from "react";

import {
  fetchInboxMessages,
  updateMessageStatus,
  fetchThreadByTarget,
  fetchSmartReply,
  createFollowUpTask,
} from "../../../api/communications";

import AIInsightsPanel from "../AIInsightsPanel";
import CustomerPopup from "../../Profile/CustomerPopup";

import {
  RefreshCcw,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  User,
} from "lucide-react";

import "./InboxPage.css";

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

/* ----------------------------------------------------------
   Direction Badge Component
---------------------------------------------------------- */
function DirectionBadge({ msg }) {
  return (
    <div className="direction-badge">
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

/* ==========================================================
   MAIN COMPONENT
========================================================== */
export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeThread, setActiveThread] = useState([]);

  // AI states
  const [aiReply, setAiReply] = useState("");
  const [aiSentiment, setAiSentiment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Popup state (only opens when user clicks “View Profile”)
  const [popupData, setPopupData] = useState(null);

  const [query, setQuery] = useState("");

  /* ----------------------------------------------------------
      LOAD INBOX → Auto-select the newest message
  ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetchInboxMessages()
      .then((data) => {
        if (cancelled) return;
        setMessages(data);
        setFiltered(data);

        if (data.length > 0) {
          autoSelectMessage(data[0]);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error?.message || "Unable to load inbox messages.");
        setMessages([]);
        setFiltered([]);
        setSelectedMessage(null);
        setActiveThread([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
      Auto-select + AI + Thread
  ---------------------------------------------------------- */
  const autoSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    try {
      const thread = await fetchThreadByTarget({
        party_universal_id: msg.party_universal_id,
        thread_id: msg.thread_id,
        contact_phone: msg.contact_phone,
        customer_id: msg.customer_id,
        lead_id: msg.lead_id,
      });
      setActiveThread(thread);
    } catch {
      setActiveThread([]);
    }
    runAI(msg.party_universal_id || msg.thread_id || msg.contact_phone);
  };

  /* ----------------------------------------------------------
      User manually selects a message
  ---------------------------------------------------------- */
  const openMessage = async (msg) => {
    await updateMessageStatus(msg.id, { is_read: true });

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
    );

    setSelectedMessage(msg);

    try {
      const thread = await fetchThreadByTarget({
        party_universal_id: msg.party_universal_id,
        thread_id: msg.thread_id,
        contact_phone: msg.contact_phone,
        customer_id: msg.customer_id,
        lead_id: msg.lead_id,
      });
      setActiveThread(thread);
    } catch {
      setActiveThread([]);
    }

    runAI(msg.party_universal_id || msg.thread_id || msg.contact_phone);
  };

  /* ----------------------------------------------------------
      AI Run
  ---------------------------------------------------------- */
  const runAI = async (partyUID) => {
    if (!partyUID) {
      setAiReply("AI unavailable.");
      setAiSentiment("neutral");
      return;
    }
    setAiLoading(true);

    try {
      const ai = await fetchSmartReply(partyUID);
      setAiReply(ai.reply);
      setAiSentiment(ai.sentiment);
    } catch {
      setAiReply("AI unavailable.");
      setAiSentiment("neutral");
    }

    setAiLoading(false);
  };

  /* ----------------------------------------------------------
      Search
  ---------------------------------------------------------- */
  const handleSearch = (e) => {
    const v = e.target.value.toLowerCase();
    setQuery(v);

    if (!v) return setFiltered(messages);

    setFiltered(
      messages.filter(
        (m) =>
          (m.display_name || "").toLowerCase().includes(v) ||
          (m.from || "").toLowerCase().includes(v) ||
          (m.body || "").toLowerCase().includes(v) ||
          (m.subject || "").toLowerCase().includes(v)
      )
    );
  };

  const createFollowUp = async () => {
    if (!selectedMessage) return;
    try {
      await createFollowUpTask({
        title: "Communication follow-up",
        description:
          aiReply || selectedMessage?.body || "Review recent conversation and respond.",
        task_type: "follow_up",
        status: "pending",
        lead: selectedMessage?.lead_id || undefined,
      });
      alert("Follow-up task created.");
    } catch {
      alert("Unable to create follow-up task.");
    }
  };

  /* ==========================================================
      RENDER
========================================================== */
  return (
    <div className="inbox-page two-column">

      {/* LEFT PANEL */}
      <div className="inbox-list">

        <div className="inbox-toolbar">
          <div className="search-group">
            <Search size={18} color="#999" />
            <input
              type="search"
              placeholder="Search messages or customers…"
              value={query}
              onChange={handleSearch}
            />
          </div>

          <div className="toolbar-actions">
            <button onClick={() => window.location.reload()}>
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>

        <h2>Unified Inbox</h2>

        {loadError ? (
          <p style={{ color: "#ef4444", fontWeight: 600 }}>{loadError}</p>
        ) : null}

        {loading ? (
          <p>Loading…</p>
        ) : !loadError && filtered.length === 0 ? (
          <p>No messages.</p>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className={`inbox-item ${msg.is_read ? "read" : "unread"}`}
              onClick={() => openMessage(msg)}
            >
              <div className="item-header">
                <span className="from">
                  {msg.display_name || msg.from || msg.contact_phone || msg.contact_email}
                </span>

                <DirectionBadge msg={msg} />

                <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
              </div>

              <div className="subject">
                {msg.subject ||
                  (msg.media_urls?.length > 0
                    ? "MMS Message"
                    : msg.channel === "email"
                    ? "Email Message"
                    : "SMS Message")}
              </div>

              <div
                className="body-preview"
                dangerouslySetInnerHTML={{ __html: msg.body }}
              />
            </div>
          ))
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="inbox-preview">

        {/* AI PANEL */}
        <AIInsightsPanel
          leadId={selectedMessage?.lead_id}
          customerId={selectedMessage?.customer_id}
          partyId={selectedMessage?.party_universal_id}
          customerName={
            selectedMessage?.display_name ||
            selectedMessage?.from ||
            selectedMessage?.contact_name ||
            "Customer"
          }
          suggestedReply={aiReply}
          sentiment={aiSentiment}
          loading={aiLoading}
          onCreateFollowUp={createFollowUp}
        />

        {/* ANALYZE BUTTON */}
        {selectedMessage && (
          <button
            className="analyze-btn"
            onClick={() => runAI(selectedMessage.party_universal_id)}
          >
            <Sparkles size={16} />
            Analyze Conversation
          </button>
        )}

        {/* VIEW PROFILE BUTTON */}
        {selectedMessage && (
          <button
            className="view-profile-btn"
            onClick={() =>
              setPopupData({
                id: selectedMessage.customer_id || selectedMessage.lead_id,
                object: selectedMessage.customer_id ? "customer" : "lead",
              })
            }
          >
            <User size={16} /> View Profile
          </button>
        )}

        {/* THREAD */}
        {activeThread.length > 0 && (
          <>
            <h3>
              Conversation with{" "}
              {selectedMessage?.display_name ||
                selectedMessage?.from ||
                selectedMessage?.contact_phone ||
                selectedMessage?.contact_email}
            </h3>

            <div className="thread-history scrollable">
              {activeThread.map((m) => (
                <div key={m.id} className={`msg-bubble ${m.direction}`}>
                  <div className="bubble-header">
                    <DirectionBadge msg={m} />
                    <span>{formatTimestamp(m.timestamp)}</span>
                  </div>

                  {m.media_urls?.length > 0 && (
                    <div className="mms-media">
                      {m.media_urls.map((url) => (
                        <img key={url} src={url} alt="MMS" />
                      ))}
                    </div>
                  )}

                  <div
                    className="bubble-body"
                    dangerouslySetInnerHTML={{ __html: m.body }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CUSTOMER POPUP */}
      {popupData && (
        <CustomerPopup
          lead={popupData}
          leadType={popupData.object}
          onClose={() => setPopupData(null)}
        />
      )}
    </div>
  );
}
