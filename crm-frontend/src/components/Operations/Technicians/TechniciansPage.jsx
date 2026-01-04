import React from "react";
import "../OpsShared.css";

const TECHS = [
  {
    id: "TECH-11",
    name: "Maria Carter",
    role: "Senior Technician",
    region: "North Tampa",
    status: "Active",
    rating: "4.9",
    workload: "28 jobs",
  },
  {
    id: "TECH-08",
    name: "Leo Grant",
    role: "Field Technician",
    region: "St. Pete",
    status: "On Leave",
    rating: "4.5",
    workload: "—",
  },
  {
    id: "TECH-14",
    name: "Khalis Edwards",
    role: "Service Manager",
    region: "All Regions",
    status: "Active",
    rating: "4.8",
    workload: "15 jobs",
  },
];

export default function TechniciansPage() {
  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Technicians & Staff</h1>
          <p className="ops-muted">Roster, performance, and daily workload coverage.</p>
        </div>
        <div className="ops-actions">
          <button className="ops-btn secondary">Upload Roster</button>
          <button className="ops-btn">Add Technician</button>
        </div>
      </header>

      <section className="ops-stat-grid">
        <div className="ops-stat">
          <div className="label">Active Technicians</div>
          <div className="value">24</div>
        </div>
        <div className="ops-stat">
          <div className="label">On Call Today</div>
          <div className="value">6</div>
        </div>
        <div className="ops-stat">
          <div className="label">Training Required</div>
          <div className="value">4</div>
        </div>
        <div className="ops-stat">
          <div className="label">Safety Checks Due</div>
          <div className="value">3</div>
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head">
          <h3>Team Roster</h3>
          <button className="ops-btn ghost">View Scheduling Coverage</button>
        </div>
        <div className="ops-table" style={{ "--ops-columns": "0.9fr 1.2fr 1.2fr 1fr 0.8fr 0.9fr 0.9fr" }}>
          <div className="ops-row head">
            <div>ID</div>
            <div>Name</div>
            <div>Role</div>
            <div>Region</div>
            <div>Status</div>
            <div>Rating</div>
            <div>Workload</div>
          </div>
          {TECHS.map((tech) => (
            <div key={tech.id} className="ops-row">
              <div className="mono">{tech.id}</div>
              <div>{tech.name}</div>
              <div>{tech.role}</div>
              <div>{tech.region}</div>
              <div>
                <span className={`ops-pill ${tech.status === "Active" ? "success" : "warn"}`}>
                  {tech.status}
                </span>
              </div>
              <div>{tech.rating}</div>
              <div>{tech.workload}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
