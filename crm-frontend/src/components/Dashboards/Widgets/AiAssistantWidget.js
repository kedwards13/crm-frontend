// src/components/Dashboards/Widgets/AiAssistantWidget.js
import React from 'react';
import './AiAssistantWidget.css';

const AiAssistantWidget = () => {
  return (
    <div className="assistant-widget">
      {/* Siri-like Orb */}
      <div className="assistant-orb-container">
        <div className="assistant-orb" />
      </div>

      {/* Header */}
      <header className="assistant-header">
        <h3>AI Assistant</h3>
        <p>Predict sales trends & prioritize leads</p>
      </header>

      {/* Chat Body */}
      <div className="assistant-chat-body">
        {/* Example messages */}
        <div className="assistant-message from-ai">
          Hello! How can I help you today?
        </div>
        <div className="assistant-message from-user">
          What are my top leads this week?
        </div>
        <div className="assistant-message from-ai">
          Your top leads are Jane Smith, ACME Corp, and John Doe.
        </div>
      </div>

      {/* Input Row */}
      <div className="assistant-input-row">
        <input
          type="text"
          className="assistant-input"
          placeholder="Type your message..."
        />
        <button className="assistant-btn send-btn">Send</button>
        <button className="assistant-btn speak-btn">Speak</button>
      </div>
    </div>
  );
};

export default AiAssistantWidget;