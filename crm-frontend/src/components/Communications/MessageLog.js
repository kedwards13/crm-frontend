// src/components/Communication/MessageLog.js
import React from 'react';
import './MessageLog.css';

/**
 * messages = [
 *   { text: "Hello there!", time: "09:15 AM", direction: "out" },
 *   { text: "Welcome! How can we assist you?", time: "09:00 AM", direction: "in" },
 * ]
 * direction: 'in' means from the customer, 'out' means from the agent
 */
const MessageLog = ({ messages, title = "Conversation" }) => {
  return (
    <div className="message-log-card">
      <h3 className="message-log-title">{title}</h3>
      {messages.length === 0 ? (
        <p className="no-messages">No messages yet.</p>
      ) : (
        <ul className="message-log-list">
          {messages.map((msg, index) => (
            <li 
              key={index} 
              className={`message-record ${msg.direction === 'in' ? 'incoming' : 'outgoing'}`}
            >
              <div className="msg-text">{msg.text}</div>
              <div className="msg-time">{msg.time}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MessageLog;