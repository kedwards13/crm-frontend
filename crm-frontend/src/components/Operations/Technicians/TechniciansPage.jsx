import React, { useEffect, useState } from "react";
import "../OpsShared.css";
import { listTechnicians } from "../../../api/schedulingApi";

const ROLE_LABELS = { tech: "Technician", rep: "Sales Rep", manager: "Manager" };

export default function TechniciansPage() {
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTechnicians()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setTechs(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load technicians");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const active = techs.filter((t) => t.is_active);
  const inactive = techs.filter((t) => !t.is_active);

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
          <div className="value">{loading ? "—" : active.length}</div>
        </div>
        <div className="ops-stat">
          <div className="label">Inactive / On Leave</div>
          <div className="value">{loading ? "—" : inactive.length}</div>
        </div>
        <div className="ops-stat">
          <div className="label">Total Staff</div>
          <div className="value">{loading ? "—" : techs.length}</div>
        </div>
      </section>

      {error && <div className="ops-error" style={{ color: "#ef4444", padding: "1rem" }}>{error}</div>}

      <section className="ops-card">
        <div className="ops-card-head">
          <h3>Team Roster</h3>
          <button className="ops-btn ghost">View Scheduling Coverage</button>
        </div>
        <div className="ops-table" style={{ "--ops-columns": "0.9fr 1.2fr 1.2fr 1fr 0.8fr 0.9fr" }}>
          <div className="ops-row head">
            <div>ID</div>
            <div>Name</div>
            <div>Role</div>
            <div>Region</div>
            <div>Status</div>
            <div>Score</div>
          </div>
          {loading ? (
            <div className="ops-row"><div style={{ gridColumn: "1/-1", textAlign: "center" }}>Loading...</div></div>
          ) : techs.length === 0 ? (
            <div className="ops-row"><div style={{ gridColumn: "1/-1", textAlign: "center" }}>No technicians found. Add staff or sync from FieldRoutes.</div></div>
          ) : (
            techs.map((tech) => (
              <div key={tech.id} className="ops-row">
                <div className="mono">{tech.id}</div>
                <div>{tech.user_name || "—"}</div>
                <div>{ROLE_LABELS[tech.role_type] || tech.role_type || "—"}</div>
                <div>{(tech.service_areas || []).join(", ") || "—"}</div>
                <div>
                  <span className={`ops-pill ${tech.is_active ? "success" : "warn"}`}>
                    {tech.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>{tech.performance_score != null ? Number(tech.performance_score).toFixed(1) : "—"}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
