// crm-frontend/src/components/Communications/Email/EmailPage.jsx
import React, { useMemo, useState } from "react";
import { Send, RefreshCw, Inbox } from "lucide-react";
import "./EmailPage.css";

const Emails = () => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailLog, setEmailLog] = useState([]);
  const emailTemplates = [
    { id: "intro", name: "Intro outreach", body: "Hi {{name}}, thanks for connecting. When works for a quick call?" },
    { id: "follow", name: "Follow-up", body: "Circling back on my last note. Do you have 10 minutes this week?" },
  ];

  const parseList = (raw = "") =>
    Array.from(
      new Set(
        raw
          .split(/[\n,;]+/)
          .map((v) => v.trim())
          .filter(Boolean)
      )
    );

  const summary = useMemo(() => {
    const toCount = parseList(to).length;
    const ccCount = parseList(cc).length;
    const bccCount = parseList(bcc).length;
    return `${toCount} to • ${ccCount} cc • ${bccCount} bcc`;
  }, [bcc, cc, to]);

  const handleSendEmail = () => {
    if (!subject.trim() || !body.trim() || !parseList(to).length) return;
    const newEmail = {
      subject,
      body,
      to: parseList(to),
      cc: parseList(cc),
      bcc: parseList(bcc),
      time: new Date().toLocaleString(),
    };
    setEmailLog((prev) => [newEmail, ...prev]);
    setSubject("");
    setBody("");
  };

  return (
    <div className="emails">
      <div className="email-header">
        <div>
          <p className="eyebrow">Messaging</p>
          <h2>Email</h2>
        </div>
        <button className="icon-btn" onClick={() => setEmailLog([])}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="email-grid">
        <div className="card">
          <div className="composer-header">
            <Inbox size={16} />
            <span>New email</span>
            <div className="pill">{summary}</div>
          </div>
          <label>To</label>
          <textarea
            rows={1}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="user@example.com, other@example.com"
          />
          <div className="grid-2">
            <div>
              <label>CC</label>
              <textarea rows={1} value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div>
              <label>BCC</label>
              <textarea rows={1} value={bcc} onChange={(e) => setBcc(e.target.value)} />
            </div>
          </div>
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
          />
          <label>Body</label>
          <textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email..."
          />
          <div className="composer-actions">
            <button onClick={handleSendEmail} className="action-button">
              <Send size={16} /> Send
            </button>
          </div>
        </div>

        <div className="card email-log">
          <div className="composer-header">
            <Inbox size={16} />
            <span>Recent</span>
          </div>
          {emailLog.length === 0 ? (
            <p className="muted">No emails sent yet.</p>
          ) : (
            <ul>
              {emailLog.map((email, index) => (
                <li key={index}>
                  <div className="email-row">
                    <div>
                      <div className="email-subject">{email.subject}</div>
                      <div className="muted tiny">
                        To {email.to.join(", ")} • {email.time}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="composer-header">
            <Inbox size={16} />
            <span>Templates</span>
          </div>
          {emailTemplates.map((tpl) => (
            <div key={tpl.id} className="template-row">
              <div>
                <div className="email-subject">{tpl.name}</div>
                <div className="muted tiny">{tpl.body}</div>
              </div>
              <button className="pill-btn" type="button" onClick={() => setBody(tpl.body)}>
                Use
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Emails;
