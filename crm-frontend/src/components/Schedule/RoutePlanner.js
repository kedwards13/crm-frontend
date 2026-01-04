import React from "react";
import "./SchedulePlaceholders.css";

export default function RoutePlanner() {
  return (
    <div className="schedule-placeholder">
      <header className="schedule-header">
        <div>
          <h2>Route Planner</h2>
          <p className="schedule-muted">Batch jobs, balance workloads, and reduce drive time.</p>
        </div>
        <button className="schedule-btn">Optimize Routes</button>
      </header>

      <section className="schedule-grid">
        <div className="schedule-stat">
          <div className="label">Routes Today</div>
          <div className="value">9</div>
        </div>
        <div className="schedule-stat">
          <div className="label">Estimated Drive Time</div>
          <div className="value">5h 40m</div>
        </div>
        <div className="schedule-stat">
          <div className="label">Unassigned Stops</div>
          <div className="value">4</div>
        </div>
        <div className="schedule-stat">
          <div className="label">Fuel Cost (Est.)</div>
          <div className="value">$142</div>
        </div>
      </section>

      <section className="schedule-card">
        <div className="schedule-table" style={{ "--schedule-columns": "1.2fr 1fr 1fr 1fr 0.8fr" }}>
          <div className="schedule-row head">
            <div>Route</div>
            <div>Technician</div>
            <div>Stops</div>
            <div>Window</div>
            <div>Status</div>
          </div>
          {[
            { route: "North Tampa AM", tech: "Maria Carter", stops: "6", window: "8am–12pm", status: "Ready" },
            { route: "South Bay PM", tech: "Leo Grant", stops: "5", window: "1pm–5pm", status: "Draft" },
          ].map((row) => (
            <div key={row.route} className="schedule-row">
              <div>{row.route}</div>
              <div>{row.tech}</div>
              <div>{row.stops}</div>
              <div>{row.window}</div>
              <div className="schedule-muted">{row.status}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
