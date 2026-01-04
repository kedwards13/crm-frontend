import React from "react";
import "./Inventory.css";

const SDS_FILES = [
  { id: "SDS-220", product: "Demand CS", updated: "Sep 12, 2025", status: "Current" },
  { id: "SDS-218", product: "Termidor HE", updated: "Aug 04, 2025", status: "Current" },
  { id: "SDS-201", product: "Talstar P", updated: "Jan 10, 2024", status: "Needs Review" },
];

const LOTS = [
  { lot: "LT-8821", product: "Bifen XTS", expiry: "Mar 18, 2026", location: "Main Warehouse" },
  { lot: "LT-8715", product: "Termidor HE", expiry: "Dec 02, 2025", location: "Truck 12" },
  { lot: "LT-8619", product: "Fastrac", expiry: "Nov 08, 2025", location: "Truck 7" },
];

export default function CompliancePage() {
  return (
    <div className="inventory-page">
      <header className="inventory-head">
        <div>
          <h1>Inventory Compliance</h1>
          <p className="muted">Track SDS, lot/expiry controls, and chemical storage audits.</p>
        </div>
        <div className="filters">
          <button className="btn mini">Upload SDS</button>
          <button className="btn mini secondary">Schedule Audit</button>
        </div>
      </header>

      <section className="inventory-grid">
        <div className="inventory-stat">
          <div className="label">SDS up to date</div>
          <div className="value">92%</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Expiring in 60d</div>
          <div className="value">6 lots</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Storage audits due</div>
          <div className="value">2</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Hazmat flags</div>
          <div className="value">1</div>
        </div>
      </section>

      <section className="inventory-card">
        <div className="inventory-table" style={{ "--inventory-columns": "0.7fr 1.4fr 1fr 0.9fr 0.8fr" }}>
          <div className="inventory-thead">
            <div>ID</div>
            <div>Product</div>
            <div>Last Update</div>
            <div>Status</div>
            <div></div>
          </div>
          {SDS_FILES.map((row) => (
            <div key={row.id} className="inventory-row">
              <div className="mono">{row.id}</div>
              <div>{row.product}</div>
              <div>{row.updated}</div>
              <div>
                <span className={`inventory-pill ${row.status === "Current" ? "success" : "warn"}`}>
                  {row.status}
                </span>
              </div>
              <div className="inventory-actions">
                <button className="btn mini secondary">View</button>
                <button className="btn mini">Replace</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="inventory-card">
        <div className="inventory-table" style={{ "--inventory-columns": "0.9fr 1.2fr 1fr 1.2fr 0.8fr" }}>
          <div className="inventory-thead">
            <div>Lot</div>
            <div>Product</div>
            <div>Expiry</div>
            <div>Location</div>
            <div></div>
          </div>
          {LOTS.map((row) => (
            <div key={row.lot} className="inventory-row">
              <div className="mono">{row.lot}</div>
              <div>{row.product}</div>
              <div>{row.expiry}</div>
              <div>{row.location}</div>
              <div className="inventory-actions">
                <button className="btn mini secondary">Track</button>
                <button className="btn mini">Move</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
