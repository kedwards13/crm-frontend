import React from "react";
import "../OpsShared.css";

const DOCS = [
  {
    id: "W9-0041",
    vendor: "Bayer Pest Supply",
    type: "W-9",
    status: "On File",
    updated: "Sep 04, 2025",
  },
  {
    id: "COI-120",
    vendor: "Univar Solutions",
    type: "Certificate of Insurance",
    status: "Expiring",
    updated: "Oct 20, 2025",
  },
  {
    id: "LIC-88",
    vendor: "Sunline Disposal",
    type: "Hazmat License",
    status: "On File",
    updated: "Jul 15, 2025",
  },
];

const CHECKS = [
  { task: "Background checks for new hires", owner: "HR", due: "Dec 30, 2025", status: "In Progress" },
  { task: "Quarterly vehicle safety audit", owner: "Ops", due: "Jan 05, 2026", status: "Scheduled" },
  { task: "State reporting (pesticide usage)", owner: "Compliance", due: "Jan 15, 2026", status: "Pending" },
];

export default function CompliancePage() {
  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Business Compliance</h1>
          <p className="ops-muted">W-9s, COIs, licenses, audits, and reporting deadlines.</p>
        </div>
        <div className="ops-actions">
          <button className="ops-btn secondary">Upload Document</button>
          <button className="ops-btn">Create Checklist</button>
        </div>
      </header>

      <section className="ops-stat-grid">
        <div className="ops-stat">
          <div className="label">Documents On File</div>
          <div className="value">38</div>
        </div>
        <div className="ops-stat">
          <div className="label">Expiring in 60 Days</div>
          <div className="value">5</div>
        </div>
        <div className="ops-stat">
          <div className="label">Open Audits</div>
          <div className="value">2</div>
        </div>
        <div className="ops-stat">
          <div className="label">Regulatory Deadlines</div>
          <div className="value">3</div>
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head">
          <h3>Vendor Compliance Files</h3>
          <button className="ops-btn ghost">Request Missing Docs</button>
        </div>
        <div className="ops-table" style={{ "--ops-columns": "0.8fr 1.4fr 1.1fr 0.9fr 0.9fr" }}>
          <div className="ops-row head">
            <div>ID</div>
            <div>Vendor</div>
            <div>Document</div>
            <div>Status</div>
            <div>Updated</div>
          </div>
          {DOCS.map((doc) => (
            <div key={doc.id} className="ops-row">
              <div className="mono">{doc.id}</div>
              <div>{doc.vendor}</div>
              <div>{doc.type}</div>
              <div>
                <span className={`ops-pill ${doc.status === "On File" ? "success" : "warn"}`}>
                  {doc.status}
                </span>
              </div>
              <div>{doc.updated}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head">
          <h3>Upcoming Audits & Tasks</h3>
          <button className="ops-btn ghost">Assign Owners</button>
        </div>
        <div className="ops-table" style={{ "--ops-columns": "1.6fr 1fr 0.8fr 0.8fr" }}>
          <div className="ops-row head">
            <div>Task</div>
            <div>Owner</div>
            <div>Due</div>
            <div>Status</div>
          </div>
          {CHECKS.map((task) => (
            <div key={task.task} className="ops-row">
              <div>{task.task}</div>
              <div>{task.owner}</div>
              <div>{task.due}</div>
              <div>
                <span className="ops-pill">{task.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
