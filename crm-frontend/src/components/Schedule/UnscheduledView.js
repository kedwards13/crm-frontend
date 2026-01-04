import React from "react";
import "./SchedulePlaceholders.css";

export default function UnscheduledView() {
  return (
    <div className="schedule-placeholder">
      <header className="schedule-header">
        <div>
          <h2>Job Pool</h2>
          <p className="schedule-muted">Unassigned jobs awaiting scheduling or technician assignment.</p>
        </div>
        <button className="schedule-btn">Auto-Assign</button>
      </header>

      <section className="schedule-card">
        <div className="schedule-table" style={{ "--schedule-columns": "1.4fr 1fr 1fr 0.9fr 0.9fr" }}>
          <div className="schedule-row head">
            <div>Customer</div>
            <div>Service</div>
            <div>Requested Window</div>
            <div>Priority</div>
            <div>Status</div>
          </div>
          {[
            { customer: "Maggie Cole", service: "General Pest Control", window: "Dec 23 AM", priority: "High", status: "Waiting" },
            { customer: "Phoenix Realty", service: "Termite Inspection", window: "Dec 24 PM", priority: "Medium", status: "Pending" },
            { customer: "Blue Harbor HOA", service: "Rodent Exclusion", window: "Dec 26", priority: "Low", status: "Waiting" },
          ].map((job) => (
            <div key={job.customer} className="schedule-row">
              <div>{job.customer}</div>
              <div>{job.service}</div>
              <div>{job.window}</div>
              <div>{job.priority}</div>
              <div className="schedule-muted">{job.status}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
