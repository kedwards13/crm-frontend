// src/components/Communications/AIInsightsPanel.js
import React, { useState, useEffect } from 'react';
import { AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';
import './AIInsightsPanel.css';

const AIInsightsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setTranscript(
        "Simulated Transcript: Customer requested premium plan details and scheduling a product demo."
      );
      setTasks([
        { id: 101, text: "Send premium plan details", approved: false },
        { id: 102, text: "Schedule product demo with customer", approved: false },
      ]);
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleApproveTask = (taskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, approved: true } : task
      )
    );
  };

  const handleDenyTask = (taskId) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const userMsg = { id: Date.now(), text: newMessage, from: 'user' };
    setChatMessages((prev) => [...prev, userMsg]);
    setNewMessage('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "AI: Got it. I'll work on that.",
          from: 'ai',
        },
      ]);
    }, 1500);
  };

  return (
    <div className="ai-panel-container">
      <div className="ai-orb" />

      <div className="ai-panel-body">
        {loading ? (
          <p className="ai-loading">Processing conversation...</p>
        ) : (
          <>
            <div className="chat-messages scrollable">
              {transcript && (
                <div className="chat-bubble ai">
                  <p>{transcript}</p>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.from}`}>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                type="text"
                placeholder="Ask AI or continue the conversation..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>

            {tasks.length > 0 && (
              <div className="ai-section">
                <h3>Suggested Tasks</h3>
                <ul className="tasks-list">
                  {tasks.map((task) => (
                    <li key={task.id} className="task-item">
                      <span className="task-text">{task.text}</span>
                      {task.approved ? (
                        <span className="task-approved">
                          <AiOutlineCheck size={18} />
                        </span>
                      ) : (
                        <div className="task-actions">
                          <button
                            className="approve-btn"
                            onClick={() => handleApproveTask(task.id)}
                          >
                            <AiOutlineCheck size={18} />
                          </button>
                          <button
                            className="deny-btn"
                            onClick={() => handleDenyTask(task.id)}
                          >
                            <AiOutlineClose size={18} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIInsightsPanel;