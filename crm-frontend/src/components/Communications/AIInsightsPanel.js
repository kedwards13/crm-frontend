// src/components/Communications/AIInsightsPanel.js
import React, { useEffect, useState } from 'react';
import { AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';
import api from '../../apiClient';
import './AIInsightsPanel.css';

const AIInsightsPanel = ({ leadId, customerId }) => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState('');
  const [suggestedReply, setSuggestedReply] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Load thread and AI insight
  useEffect(() => {
    const loadThread = async () => {
      try {
        const threadRes = await api.get('/comms/thread/', {
          params: { lead_id: leadId, customer_id: customerId },
        });
        setMessages(threadRes.data.messages);

        const aiRes = await api.get('/comms/smart-reply/', {
          params: { lead_id: leadId, customer_id: customerId },
        });

        setSuggestedReply(aiRes.data.reply);
        setSummary(aiRes.data.sentiment);

        setTasks([
          { id: 1, text: 'Follow up with suggested reply', approved: false },
        ]);
      } catch (err) {
        console.error('AI Insights error', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId || customerId) loadThread();
  }, [leadId, customerId]);

  const handleApproveTask = (taskId) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, approved: true } : t)));
  };

  const handleDenyTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = { id: Date.now(), text: newMessage, from: 'user' };
    setChatMessages(prev => [...prev, msg]);
    setNewMessage('');

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { id: Date.now(), text: "AI: Got it. I'll handle that.", from: 'ai' },
      ]);
    }, 1000);
  };

  return (
    <div className="ai-panel-container">
      {loading ? (
        <p className="ai-loading">Analyzing conversation...</p>
      ) : (
        <>
          <div className="ai-section">
            <h3>AI Summary</h3>
            <p className="ai-summary-text">{summary || 'No summary available.'}</p>
          </div>

          <div className="ai-section">
            <h3>Suggested Reply</h3>
            <div className="ai-suggested-reply">{suggestedReply || 'N/A'}</div>
          </div>

          <div className="chat-messages scrollable">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`chat-bubble ${msg.from}`}>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Ask AI or continue..."
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
                        <button onClick={() => handleApproveTask(task.id)}>
                          <AiOutlineCheck size={18} />
                        </button>
                        <button onClick={() => handleDenyTask(task.id)}>
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
  );
};

export default AIInsightsPanel;