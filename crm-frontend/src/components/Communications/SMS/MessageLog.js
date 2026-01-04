// src/components/Communications/MessageLog.jsx
import React, { useEffect, useRef } from "react";
import "./MessageLog.css";

export default function MessageLog({ messages = [], title = "Conversation" }) {
  const bottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages.length)
    return <p className="no-messages">No messages yet.</p>;

  return (
    <div className="message-log">
      <h3 className="message-log-title">{title}</h3>

      <ul className="message-log-list">
        {messages.map((msg, i) => {
          const direction =
            msg.direction === "inbound" || msg.direction === "in" ? "in" : "out";

          const text = msg.body || msg.text || "";
          const image = msg.media_url; // Twilio MMS
          const time = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return (
            <li key={msg.id || i} className={`msg-bubble ${direction}`}>
              <div className="msg-body">
                {text && <p>{text}</p>}
                {image && (
                  <img src={image} alt="mms" className="msg-image" />
                )}
              </div>

              <div className="msg-meta">
                {direction === "in" ? "Customer • " : "You • "}
                {time}
              </div>
            </li>
          );
        })}
      </ul>

      <div ref={bottomRef}></div>
    </div>
  );
}