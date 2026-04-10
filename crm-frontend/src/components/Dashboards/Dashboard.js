import React, { useState } from 'react';
import { ArrowUp, Sparkles, Zap, Users, DollarSign, Activity } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const [input, setInput] = useState('');

  // INITIAL STATE (The "Morning Report")
  const [messages, setMessages] = useState([
    {
      role: 'system',
      text: 'Good evening, Khalis. System is operational.',
      widgets: [
        { label: 'Revenue (MTD)', value: '$124,500', sub: '+8.2%', icon: DollarSign },
        { label: 'Active Leads', value: '142', sub: '+12 Today', icon: Users },
        { label: 'Efficiency', value: '94%', sub: 'Optimal', icon: Zap },
        { label: 'Pending', value: '3', sub: 'High Priority', icon: Activity }
      ]
    }
  ]);

  const handleSend = () => {
    if (!input.trim()) {
      return;
    }

    const currentInput = input;

    // 1. Add User Message
    const userMsg = { role: 'user', text: currentInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // 2. Simulate AI Processing (Mock)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          text: `Processing "${currentInput}"... I've identified 3 potential workflows.`,
          widgets: null
        }
      ]);
    }, 800);
  };

  return (
    <div className='jarvis-container'>
      {/* Background Ambience */}
      <div className='jarvis-orb' />

      {/* CHAT STREAM */}
      <div className='jarvis-stream'>
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}-${msg.text.slice(0, 10)}`} className='jarvis-message'>
            {/* TEXT */}
            <div className={`jarvis-text ${msg.role === 'user' ? 'jarvis-text-user' : ''}`}>{msg.text}</div>

            {/* WIDGETS (Only for System) */}
            {msg.widgets && (
              <div className='jarvis-grid'>
                {msg.widgets.map((widget, idx) => {
                  const Icon = widget.icon;

                  return (
                    <div key={`${widget.label}-${idx}`} className='jarvis-card'>
                      <div className='jarvis-card-header'>
                        <Icon size={20} />
                        <Sparkles size={14} className='jarvis-sparkle' />
                      </div>
                      <div className='card-value'>{widget.value}</div>
                      <div className='card-sub'>{widget.sub}</div>
                      <div className='card-label'>{widget.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FLOATING INPUT (Apple Style) */}
      <div className='jarvis-input-container'>
        <div className='jarvis-input-box'>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder='Ask Abon to analyze data, start campaigns, or route techs...'
            className='jarvis-input'
            autoFocus
          />
          <button type='button' onClick={handleSend} className='jarvis-send-btn' aria-label='Send message'>
            <ArrowUp size={20} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
