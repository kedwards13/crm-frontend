// src/components/Communications/AIInsightsPanel.js
import React, { useEffect, useState } from "react";
import "./AIInsightsPanel.css";

export default function AIInsightsPanel({
  leadId,
  customerId,
  partyId,
  customerName,
  suggestedReply,
  sentiment,
  loading,
  onCreateFollowUp,
}) {
  const [localSuggested, setLocalSuggested] = useState(suggestedReply || "");
  const [localSummary, setLocalSummary] = useState(sentiment || "");

  /* -----------------------------------------------
     AUTO SYNC WITH INBOX AI VALUES 
  ------------------------------------------------ */
  useEffect(() => {
    setLocalSuggested(suggestedReply || "");
    setLocalSummary(sentiment || "");
  }, [suggestedReply, sentiment]);

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
            <h3>Conversation Insight</h3>
            <p>
              {localSummary && localSummary !== "neutral"
                ? localSummary
                : "No summary available."}
            </p>
          </section>

          {/* ---------------- SUGGESTED REPLY ---------------- */}
          <section className="ai-card minimal-fade">
            <h3>Suggested Response</h3>
            <p className="ai-suggest">{localSuggested || "N/A"}</p>
          </section>
          <section className="ai-card minimal-fade">
            <h3>Operational Actions</h3>
            <p>Use this insight to respond quickly and create follow-up ownership.</p>
            <div className="ai-action-row">
              <button type="button" onClick={onCreateFollowUp}>
                Create Follow-up Task
              </button>
              <button type="button" onClick={() => navigator.clipboard?.writeText(localSuggested || "")}>
                Copy Suggested Response
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
