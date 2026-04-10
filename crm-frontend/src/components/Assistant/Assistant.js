import React, { useState, useEffect, useRef } from 'react';
import api from '../../apiClient';
import './Assistant.css';

const parseCommandInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw.toLowerCase().startsWith('/cmd ')) return null;

  const remainder = raw.slice(5).trim();
  if (!remainder) return null;
  const firstSpace = remainder.indexOf(' ');
  if (firstSpace < 0) {
    return { action: remainder, payload: {} };
  }

  const action = remainder.slice(0, firstSpace).trim();
  const payloadText = remainder.slice(firstSpace + 1).trim();
  if (!action) return null;
  if (!payloadText) return { action, payload: {} };

  try {
    const payload = JSON.parse(payloadText);
    return { action, payload: payload && typeof payload === 'object' ? payload : {} };
  } catch {
    return null;
  }
};

const Assistant = ({ tianLeads = [] }) => {
  const [messages, setMessages] = useState([
    { text: 'Hello! I’m your lead assistant. I can help you analyze leads, suggest offers, and follow up.', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const firstLead = tianLeads[0] || {};

  const quickActions = [
    {
      label: 'Send offer to top lead',
      action: 'send_sms',
      payload: {
        lead_id: firstLead?.id,
        to_phone: firstLead?.phone || firstLead?.primary_phone,
        body: 'Hi! We can help with your service request. Reply YES for a quick quote.',
      },
    },
    {
      label: 'Create callback task',
      action: 'create_task',
      payload: {
        lead_id: firstLead?.id,
        title: 'Call back interested lead',
        description: 'Customer showed interest and needs follow-up.',
      },
    },
    {
      label: 'Start revival campaign',
      action: 'start_campaign',
      payload: {
        customer_id: firstLead?.customer_id,
        campaign_name: 'Revival Follow-up',
        channel: 'sms',
      },
    },
  ];

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show summary of incoming leads
  useEffect(() => {
    if (tianLeads.length > 0) {
      const leadSummary = `You have ${tianLeads.length} new leads. Top 3: ${tianLeads
        .slice(0, 3)
        .map((l) => `${l.name || 'Unknown'} at ${l.address || 'No address'}`)
        .join(', ')}.`;
      setMessages((prev) => [...prev, { text: leadSummary, sender: 'bot' }]);
    }
  }, [tianLeads]);

  // Set up voice recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
      };
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        setListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { text: input.trim(), sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const parsedCommand = parseCommandInput(input);
      let data;
      if (parsedCommand) {
        const commandRes = await api.post('/assistant/command/', {
          action: parsedCommand.action,
          payload: parsedCommand.payload || {},
        });
        data = commandRes?.data || {};
      } else {
        const queryRes = await api.post('/assistant/query/', {
          query: input.trim(),
          context: 'crm_assistant_panel',
          leads: tianLeads,
        });
        data = queryRes?.data || {};
      }

      setInput('');

      const botMessage = {
        text:
          data?.response ||
          data?.message ||
          data?.reply ||
          (data?.status ? `Command ${data.status}.` : '') ||
          'AI did not return a response.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages((prev) => [
        ...prev,
        { text: 'Something went wrong processing your request.', sender: 'bot' },
      ]);
    }
  };

  const runQuickAction = async (actionConfig) => {
    try {
      const { data } = await api.post('/assistant/command/', {
        action: actionConfig.action,
        payload: actionConfig.payload || {},
      });
      const status = data?.status || 'queued';
      setMessages((prev) => [
        ...prev,
        { text: `Action "${actionConfig.label}" ${status}.`, sender: 'bot' },
      ]);
    } catch (error) {
      console.error('AI Action Error:', error);
      setMessages((prev) => [
        ...prev,
        { text: `Action "${actionConfig.label}" failed.`, sender: 'bot' },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  return (
    <div className="ai-panel-container">
      <div className="ai-orb" />
      <div className="ai-panel-body">

        {/* Chat Message History */}
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.sender}`}>
              <p>{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Row */}
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask something about your leads..."
          />
          <button onClick={handleSend}>Send</button>
          <button onClick={toggleListening} className={listening ? 'listening' : ''}>
            🎤
          </button>
        </div>

        {/* Suggested Tasks Section */}
        <div className="ai-section">
          <h4>Suggested Tasks</h4>
          <ul className="tasks-list">
            {quickActions.map((task, i) => (
              <li key={i} className="task-item">
                <span className="task-text">{task.label}</span>
                <div className="task-actions">
                  <button className="approve-btn" onClick={() => runQuickAction(task)}>✔</button>
                  <button className="deny-btn">✘</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
};

export default Assistant;
