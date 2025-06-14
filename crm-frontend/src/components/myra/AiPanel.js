// src/components/AI/AIPanel.js
import React, { useState, useEffect } from 'react';
import './AiPanel.css';

const AIPanel = ({ initialTranscript = "", initialTasks = [] }) => {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [tasks, setTasks] = useState(initialTasks);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");

  // Simulate fetching the transcript and suggested tasks when the panel mounts.
  useEffect(() => {
    setTimeout(() => {
      setTranscript("Simulated Transcript: The call lasted 5 minutes. The customer is interested in our premium plan and wants more details.");
      setTasks([
        { id: 1, text: "Follow up with premium plan details", approved: false },
        { id: 2, text: "Schedule a product demo", approved: false },
      ]);
    }, 3000);
  }, []);

  const handleApproveTask = (taskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, approved: true } : task
      )
    );
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      // Add the user's message.
      setChatMessages((prev) => [...prev, { sender: "user", text: inputMessage }]);
      setInputMessage("");
      // Simulate an AI reply.
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: "AI Response: I recommend scheduling a follow-up call next week." },
        ]);
      }, 1000);
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-orb"></div>
        <h2 className="ai-title">AI Assistant</h2>
      </div>
      
      <div className="ai-transcript-container">
        {transcript ? (
          <p className="ai-transcript">{transcript}</p>
        ) : (
          <p className="ai-loading">Processing transcript…</p>
        )}
      </div>

      <div className="ai-tasks-container">
        <h3 className="tasks-title">Suggested Tasks</h3>
        <ul className="tasks-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <span>{task.text}</span>
              {!task.approved ? (
                <button className="approve-btn" onClick={() => handleApproveTask(task.id)}>
                  Approve
                </button>
              ) : (
                <span className="approved-label">Approved</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="ai-chat-container">
        <div className="chat-log">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender === "ai" ? "ai-msg" : "user-msg"}`}>
              {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default AiPanel;