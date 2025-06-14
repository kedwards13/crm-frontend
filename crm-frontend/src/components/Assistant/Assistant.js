import React, { useState, useEffect, useRef } from 'react';
import './Assistant.css';

const Assistant = ({ tianLeads = [] }) => {
  const [messages, setMessages] = useState([
    { text: 'Hello! I’m your lead assistant. I can help you analyze leads, suggest offers, and follow up.', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

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
    setInput('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:808/api/ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ message: input.trim(), leads: tianLeads }),
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      const botMessage = { text: data.reply || 'AI did not return a response.', sender: 'bot' };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages((prev) => [
        ...prev,
        { text: 'Something went wrong processing your request.', sender: 'bot' },
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
            {[
              'Send offer to top lead',
              'Mark leads without phone as inactive',
              'Schedule callback for interested sellers'
            ].map((task, i) => (
              <li key={i} className="task-item">
                <span className="task-text">{task}</span>
                <div className="task-actions">
                  <button className="approve-btn">✔</button>
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