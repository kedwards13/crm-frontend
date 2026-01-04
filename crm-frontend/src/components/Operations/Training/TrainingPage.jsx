import React from "react";
import "../OpsShared.css";
import "./TrainingPage.css";

const PATHS = [
  {
    title: "New Hire Onboarding",
    description: "Company standards, dispatch workflow, customer care basics.",
    modules: 8,
    duration: "6 hrs",
    completion: "74%",
  },
  {
    title: "Pest Control Safety",
    description: "Chemical handling, PPE, vehicle kit inspections.",
    modules: 5,
    duration: "4 hrs",
    completion: "92%",
  },
  {
    title: "Field Sales Playbook",
    description: "Objections, quoting, and upsell scripts.",
    modules: 6,
    duration: "5 hrs",
    completion: "61%",
  },
];

const CERTS = [
  { name: "EPA 7A Certification", due: "Jan 15, 2026", status: "Active", owner: "Ops" },
  { name: "OSHA Safety Refresh", due: "Feb 02, 2026", status: "Due Soon", owner: "HR" },
  { name: "State Applicator License", due: "Mar 30, 2026", status: "Active", owner: "Compliance" },
];

export default function TrainingPage() {
  return (
    <div className="ops-page ops-training">
      <header className="ops-head">
        <div>
          <h1>Training Suite</h1>
          <p className="ops-muted">Courses, certifications, and playbooks for the field team.</p>
        </div>
        <div className="ops-actions">
          <button className="ops-btn secondary">Upload Content</button>
          <button className="ops-btn">Create Course</button>
        </div>
      </header>

      <section className="ops-stat-grid">
        <div className="ops-stat">
          <div className="label">Active Courses</div>
          <div className="value">14</div>
        </div>
        <div className="ops-stat">
          <div className="label">Completion Rate</div>
          <div className="value">86%</div>
        </div>
        <div className="ops-stat">
          <div className="label">Certifications Due</div>
          <div className="value">5</div>
        </div>
        <div className="ops-stat">
          <div className="label">New Hires This Month</div>
          <div className="value">3</div>
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head">
          <h3>Learning Paths</h3>
          <button className="ops-btn ghost">Assign Path</button>
        </div>
        <div className="training-grid">
          {PATHS.map((path) => (
            <div key={path.title} className="training-card">
              <div>
                <h4>{path.title}</h4>
                <p>{path.description}</p>
              </div>
              <div className="training-meta">
                <span>{path.modules} modules</span>
                <span>{path.duration}</span>
                <span className="training-progress">{path.completion} complete</span>
              </div>
              <div className="training-actions">
                <button className="ops-btn secondary">Preview</button>
                <button className="ops-btn">Assign</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head">
          <h3>Compliance Certifications</h3>
          <button className="ops-btn ghost">Export Tracker</button>
        </div>
        <div className="ops-table" style={{ "--ops-columns": "1.6fr 1fr 0.8fr 0.8fr" }}>
          <div className="ops-row head">
            <div>Certification</div>
            <div>Renewal Due</div>
            <div>Status</div>
            <div>Owner</div>
          </div>
          {CERTS.map((cert) => (
            <div key={cert.name} className="ops-row">
              <div>{cert.name}</div>
              <div>{cert.due}</div>
              <div>
                <span className={`ops-pill ${cert.status === "Active" ? "success" : "warn"}`}>
                  {cert.status}
                </span>
              </div>
              <div>{cert.owner}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
