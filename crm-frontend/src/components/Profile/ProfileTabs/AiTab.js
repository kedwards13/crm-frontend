import React, { useEffect } from "react";
import {
  FiFileText,
  FiPhoneCall,
  FiMessageSquare,
  FiActivity,
} from "react-icons/fi";
import "./AiTab.css";

export default function AiTab({
  lead,
  aiMessages,
  aiInput,
  setAiInput,
  setAiMessages,
  chatRef,
}) {
  useEffect(() => {
    if (chatRef?.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const API_BASE = process.env.REACT_APP_API_BASE || "https://os.abon.ai";

  /* --------------------------------------------------------------
     SEND AI MESSAGE
     Full backend -> AI -> response pipeline
  -------------------------------------------------------------- */
  async function sendAiMessage() {
    if (!aiInput.trim()) return;

    const userInput = aiInput.trim();
    setAiInput("");

    // Push user’s message locally
    setAiMessages((prev) => [...prev, { sender: "user", text: userInput }]);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat/lead/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userInput,
          lead_context: lead.raw || lead,
          tenant_id: lead.tenant || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");

      setAiMessages((prev) => [...prev, { sender: "ai", text: data.response }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { sender: "ai", text: "AI Error: " + err.message },
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

  /* --------------------------------------------------------------
     RENDER
  -------------------------------------------------------------- */
  return (
    <div className="gt-ai">
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
          placeholder="Ask the intelligence engine…"
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
        />
        <button className="gt-ai-send" onClick={sendAiMessage}>
          Send
        </button>
      </div>
    </div>
  );
}