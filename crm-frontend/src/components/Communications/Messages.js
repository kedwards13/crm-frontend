// src/components/Communication/Messages.js
import React, { useState, useEffect } from 'react';
import MessageLog from './MessageLog';
import './Messages.css';

const Messages = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState('');
  const [taskCreated, setTaskCreated] = useState(false);

  // For demonstration, fetch existing conversation or missed caller info on mount
  useEffect(() => {
    // Example initial message
    const initialMessages = [
      { text: 'Welcome to our service! How can we help you?', time: '09:00 AM', direction: 'in' },
    ];
    setMessages(initialMessages);
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;
    // Push new outbound message to local state; replace with API call as needed
    const newMsg = {
      text: message,
      time: new Date().toLocaleTimeString(),
      direction: 'out',
    };
    setMessages(prev => [newMsg, ...prev]);
    setMessage('');
    setAiSuggestion('');
  };

  const handleAiSuggestion = async () => {
    if (!message.trim()) return;
    setLoadingAi(true);

    try {
      // Simulate a fetch to your AI suggestion endpoint
      setTimeout(() => {
        setAiSuggestion(`(AI) Perhaps mention our next available appointment slot?`);
        setLoadingAi(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching AI suggestion', err);
      setLoadingAi(false);
    }
  };

  // When user accepts the AI suggestion, send it as a message and create a follow-up task.
  const handleAcceptAiSuggestion = async () => {
    if (!aiSuggestion.trim()) return;
    const newMsg = {
      text: aiSuggestion,
      time: new Date().toLocaleTimeString(),
      direction: 'out',
    };
    setMessages(prev => [newMsg, ...prev]);
    setAiSuggestion('');

    // Call API to create a new task based on the AI suggestion.
    try {
      const token = localStorage.getItem('token');
      const taskPayload = {
        title: "Follow-up: " + aiSuggestion.substring(0, 30) + "...",
        description: aiSuggestion,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
      };
      const response = await fetch('/api/tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(taskPayload),
      });
      if (response.ok) {
        setTaskCreated(true);
        // Optionally, you can update your UI or fetch the new task list.
      } else {
        console.error("Failed to create task");
      }
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  return (
    <div className="messages-container">
      <h2 className="messages-title">Text Messaging</h2>

      {/* Text input area */}
      <div className="message-input">
        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="text-area"
        />
        <div className="input-buttons">
          <button onClick={handleSend} className="action-button">
            Send
          </button>
          <button
            onClick={handleAiSuggestion}
            className="secondary-button"
            disabled={loadingAi}
          >
            {loadingAi ? 'AI...' : 'Get AI Suggestion'}
          </button>
        </div>
      </div>

      {/* AI Suggestion box */}
      {aiSuggestion && (
        <div className="ai-suggestion-box">
          <p className="ai-suggestion-text">AI Suggestion: {aiSuggestion}</p>
          <button onClick={handleAcceptAiSuggestion} className="action-button">
            Accept &amp; Create Follow-Up
          </button>
        </div>
      )}

      {/* Conversation log */}
      <MessageLog messages={messages} title="Conversation History" />

      {taskCreated && (
        <div className="status-message">
          Follow-up task created successfully.
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default Messages;