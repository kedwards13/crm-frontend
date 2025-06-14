import React from 'react';
import './AiTab.css';

const AiTab = ({ aiMessages, aiInput, setAiInput, sendAiMessage, chatRef }) => {
  const handleNextStep = (message) => {
    setAiInput(message);
    setTimeout(() => sendAiMessage(), 100); // simulate enter press
  };

  return (
    <div className="ai-chat-wrapper">
      <div className="ai-header">
        <div className="ai-orb-glow" />
        <h3>Lead Intelligence Assistant</h3>
        <p className="ai-sub">Ask anything or choose a suggested action below:</p>
      </div>

      <div className="ai-suggestions">
        <button onClick={() => handleNextStep("Generate a contract for this lead.")}>
          📄 Generate Contract
        </button>
        <button onClick={() => handleNextStep("Request seller's ID and ownership documents.")}>
          🧾 Request Documents
        </button>
        <button onClick={() => handleNextStep("Schedule a follow-up call.")}>
          📞 Schedule Follow-Up
        </button>
        <button onClick={() => handleNextStep("Summarize this lead’s current status.")}>
          🧠 Ask AI for Summary
        </button>
      </div>

      <div className="ai-chat-window" ref={chatRef}>
        {aiMessages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.sender}`}>
            <div className="bubble">
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-chat-input">
        <input
          type="text"
          value={aiInput}
          placeholder="e.g., What’s the offer status?"
          onChange={(e) => setAiInput(e.target.value)}
        />
        <button onClick={sendAiMessage}>Ask</button>
      </div>
    </div>
  );
};

export default AiTab;