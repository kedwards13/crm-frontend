import React, { useEffect } from "react";
import {
  FiFileText,
  FiPhoneCall,
  FiMessageSquare,
  FiActivity,
} from "react-icons/fi";
import api from "../../../apiClient";
import useAiCapabilities from "../../../hooks/useAiCapabilities";
import CustomerIntelligencePanel from "../../Customers/components/CustomerIntelligencePanel";
import "./AiTab.css";

export default function AiTab({
  lead,
  aiMessages,
  aiInput,
  setAiInput,
  setAiMessages,
  chatRef,
}) {
  const aiCapabilities = useAiCapabilities();

  useEffect(() => {
    if (chatRef?.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [aiMessages, chatRef]);

  /* --------------------------------------------------------------
     SEND AI MESSAGE
     Full backend -> AI -> response pipeline
  -------------------------------------------------------------- */
  async function sendAiMessage() {
    if (!aiCapabilities.intelligenceEnabled) {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            aiCapabilities.error ||
            aiCapabilities.disabledReason ||
            "AI is disabled for this tenant. The CRM record remains fully available.",
        },
      ]);
      return;
    }
    if (!aiInput.trim()) return;

    const userInput = aiInput.trim();
    setAiInput("");

    // Push user’s message locally
    setAiMessages((prev) => [...prev, { sender: "user", text: userInput }]);

    try {
      const res = await api.post("/assistant/query/", {
        query: userInput,
        context: "crm_profile_ai_tab",
        lead_id: lead?.id || lead?.lead_id || lead?.raw?.id || undefined,
        customer_id:
          lead?.customer_id || lead?.raw?.customer_id || lead?.raw?.id || undefined,
      });
      const responseText = String(res?.data?.response || res?.data?.message || "").trim();
      setAiMessages((prev) => [
        ...prev,
        { sender: "ai", text: responseText || "AI did not return a response." },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { sender: "ai", text: "AI Error: " + (err?.message || "request failed") },
      ]);
    }
  }

  /* --------------------------------------------------------------
     ACTION PANEL (Palantir-style quick ops)
  -------------------------------------------------------------- */
  const actions = [
    {
      label: "Summarize Profile",
      cmd:
        "Summarize this customer's complete profile with risks, opportunities, and recommended next steps.",
      icon: <FiActivity size={16} />,
    },
    {
      label: "Generate Contract Draft",
      cmd:
        "Generate a contract or proposal draft based on all available customer and property data.",
      icon: <FiFileText size={16} />,
    },
    {
      label: "Schedule Follow-Up Plan",
      cmd:
        "Build an optimal follow-up plan for this customer based on priority and pipeline stage.",
      icon: <FiPhoneCall size={16} />,
    },
    {
      label: "Craft Personalized Message",
      cmd:
        "Create a personalized outbound SMS/email message tailored to this customer's profile.",
      icon: <FiMessageSquare size={16} />,
    },
  ];

  const runAction = (cmd) => {
    setAiInput(cmd);
    setTimeout(() => sendAiMessage(), 100);
  };

  const raw = lead?.raw || {};
  const objectType = String(lead?.object || raw?.object || "").trim().toLowerCase();
  const customerId =
    lead?.customer_id ||
    raw?.customer_id ||
    (objectType === "customer" ? lead?.id || raw?.id : "");
  const leadId =
    objectType === "lead" ? lead?.lead_id || lead?.id || raw?.lead_id || raw?.id : "";

  /* --------------------------------------------------------------
     RENDER
  -------------------------------------------------------------- */
  return (
    <div className="gt-ai">
      <CustomerIntelligencePanel
        customerId={customerId || undefined}
        leadId={!customerId && leadId ? leadId : undefined}
        compact
        title="CRM Intelligence"
        subtitle="Structured ontology context is the primary AI layer here. Freeform assistant prompts are secondary."
        enabled={aiCapabilities.intelligenceEnabled}
        availabilityLoading={aiCapabilities.loading}
        disabledReason={aiCapabilities.error || aiCapabilities.disabledReason}
      />

      {/* Header */}
      <div className="gt-ai-header">
        <div className="gt-ai-orb" />
        <div className="gt-ai-header-text">
          <h3>Intelligence Panel</h3>
          <p className="gt-ai-sub">
            Analytical insights and reasoning generated from this record.
          </p>
        </div>
      </div>

      {/* Smart Actions */}
      <div className="gt-ai-actions">
        {actions.map((action, idx) => (
          <button
            key={idx}
            className="gt-ai-action-btn"
            onClick={() => runAction(action.cmd)}
            disabled={!aiCapabilities.intelligenceEnabled}
          >
            <span className="gt-ai-action-icon">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="gt-ai-chat" ref={chatRef}>
        {aiMessages.map((msg, i) => (
          <div key={i} className={`gt-ai-msg ${msg.sender}`}>
            <div className="gt-ai-bubble">{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input Row */}
      <div className="gt-ai-input-row">
        <input
          type="text"
          className="gt-ai-input"
          value={aiInput}
          placeholder={
            aiCapabilities.intelligenceEnabled
              ? "Ask the intelligence engine…"
              : "AI is disabled. CRM data remains available."
          }
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
          disabled={!aiCapabilities.intelligenceEnabled}
        />
        <button className="gt-ai-send" onClick={sendAiMessage} disabled={!aiCapabilities.intelligenceEnabled}>
          Send
        </button>
      </div>
    </div>
  );
}
