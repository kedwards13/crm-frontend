// crm-frontend/src/components/Communications/Inbox/InboxPage.js
import React, { useEffect, useState } from "react";

import {
  fetchInboxMessages,
  updateMessageStatus,
  fetchThreadByTarget,
  fetchSmartReply,
} from "../../../api/communications";

import api from "../../../apiClient";
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
    fetchInboxMessages()
      .then((data) => {
        setMessages(data);
        setFiltered(data);

        if (data.length > 0) {
          autoSelectMessage(data[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* ----------------------------------------------------------
     Auto-select + AI + Thread
  ---------------------------------------------------------- */
  const autoSelectMessage = async (msg) => {
    setSelectedMessage(msg);

    const thread = await fetchThreadByTarget(msg.party_universal_id);
    setActiveThread(thread);

    runAI(msg.party_universal_id);
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

    const thread = await fetchThreadByTarget(msg.party_universal_id);
    setActiveThread(thread);

    runAI(msg.party_universal_id);
  };

  /* ----------------------------------------------------------
     AI Run
  ---------------------------------------------------------- */
  const runAI = async (partyUID) => {
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
          (m.from || "").toLowerCase().includes(v) ||
          (m.body || "").toLowerCase().includes(v) ||
          (m.subject || "").toLowerCase().includes(v)
      )
    );
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

        {loading ? (
          <p>Loading…</p>
        ) : filtered.length === 0 ? (
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
                  {msg.from || msg.contact_phone || msg.contact_email}
                </span>

                <DirectionBadge msg={msg} />

                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
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
            selectedMessage?.from ||
            selectedMessage?.contact_name ||
            "Customer"
          }
          suggestedReply={aiReply}
          sentiment={aiSentiment}
          loading={aiLoading}
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
              {selectedMessage?.from ||
                selectedMessage?.contact_phone ||
                selectedMessage?.contact_email}
            </h3>

            <div className="thread-history scrollable">
              {activeThread.map((m) => (
                <div key={m.id} className={`msg-bubble ${m.direction}`}>
                  <div className="bubble-header">
                    <DirectionBadge msg={m} />
                    <span>{new Date(m.timestamp).toLocaleString()}</span>
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

      {/* CUSTOMER POPUP (only opens when user clicks "View Profile") */}
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