// crm-frontend/src/components/Communications/Email/EmailPage.jsx
import React, { useState } from 'react';
import './EmailPage.css';

const Emails = () => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailLog, setEmailLog] = useState([]);

  const handleSendEmail = () => {
    if (!subject.trim() || !body.trim()) return;
    console.log(`Sending email with subject: ${subject}`);
    const newEmail = { subject, body, time: new Date().toLocaleTimeString() };
    setEmailLog(prev => [newEmail, ...prev]);
    setSubject('');
    setBody('');
  };

  return (
    <div className="emails">
      <h2>Email Dashboard</h2>
      <div className="email-input-group">
        <input
          type="text"
          placeholder="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="email-input"
        />
        <textarea
          placeholder="Email Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="email-textarea"
        />
        <button onClick={handleSendEmail} className="action-button">
          Send Email
        </button>
      </div>
      <div className="email-log">
        <h3>Email Log</h3>
        {emailLog.length === 0 ? (
          <p>No emails sent yet.</p>
        ) : (
          <ul>
            {emailLog.map((email, index) => (
              <li key={index}>
                <span className="email-subject">{email.subject}</span>
                <span className="email-time">{email.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Emails;