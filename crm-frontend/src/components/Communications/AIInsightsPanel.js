// src/components/Communications/AIInsightsPanel.js
import React, { useEffect, useState } from "react";
import api from "../../apiClient";
import "./AIInsightsPanel.css";

export default function AIInsightsPanel({
  leadId,
  customerId,
  partyId,
  customerName,
  suggestedReply,
  sentiment,
  loading,
}) {
  const [localSuggested, setLocalSuggested] = useState(suggestedReply || "");
  const [localSummary, setLocalSummary] = useState(sentiment || "");
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  /* -----------------------------------------------
     AUTO SYNC WITH INBOX AI VALUES 
  ------------------------------------------------ */
  useEffect(() => {
    setLocalSuggested(suggestedReply || "");
    setLocalSummary(sentiment || "");
  }, [suggestedReply, sentiment]);

  /* -----------------------------------------------
     CHAT SEND
  ------------------------------------------------ */
  const handleSend = () => {
    if (!newMessage.trim()) return;

    const msg = {
      id: Date.now(),
      text: newMessage,
      from: "user",
    };

    setChatMessages((prev) => [...prev, msg]);
    setNewMessage("");

    // fake ai return
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "AI: Understood.",
          from: "ai",
        },
      ]);
    }, 900);
  };

  return (
    <div className="ai-panel">

      {/* ---------------- LOADING ---------------- */}
      {loading && (
        <div className="ai-loading minimal-fade">
          <p>Analyzing conversation…</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ---------------- SUMMARY ---------------- */}
          <section className="ai-card minimal-fade">
            <h3>AI Summary</h3>
            <p>
              {localSummary && localSummary !== "neutral"
                ? localSummary
                : "No summary available."}
            </p>
          </section>

          {/* ---------------- SUGGESTED REPLY ---------------- */}
          <section className="ai-card minimal-fade">
            <h3>Suggested Reply</h3>
            <p className="ai-suggest">{localSuggested || "N/A"}</p>
          </section>

          {/* ---------------- CHAT LOG ---------------- */}
          <section className="ai-chat minimal-fade">
            <div className="chat-scroll">
              {chatMessages.map((m) => (
                <div key={m.id} className={`bubble ${m.from}`}>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask AI or continue…"
              />
              <button onClick={handleSend}>Send</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}