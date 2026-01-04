import React from "react";
import "./Inventory.css";

const VENDORS = [
  {
    id: "V-14",
    name: "Bayer Pest Supply",
    rating: "4.9",
    leadTime: "3-5 days",
    contact: "orders@bayerpest.com",
    terms: "Net 30",
    category: "Chemicals",
  },
  {
    id: "V-09",
    name: "Syngenta Pro",
    rating: "4.6",
    leadTime: "5-7 days",
    contact: "support@syngentapro.com",
    terms: "Net 15",
    category: "Baits & Traps",
  },
  {
    id: "V-22",
    name: "Univar Solutions",
    rating: "4.3",
    leadTime: "2-4 days",
    contact: "ops@univar.com",
    terms: "Net 45",
    category: "PPE & Safety",
  },
];

export default function VendorsPage() {
  return (
    <div className="inventory-page">
      <header className="inventory-head">
        <div>
          <h1>Vendors</h1>
          <p className="muted">Preferred suppliers, SLAs, and procurement terms.</p>
        </div>
        <div className="filters">
          <input placeholder="Search vendors…" />
          <select defaultValue="all">
            <option value="all">All categories</option>
            <option value="chemicals">Chemicals</option>
            <option value="bait">Baits & Traps</option>
            <option value="ppe">PPE & Safety</option>
          </select>
          <button className="btn mini">+ Add Vendor</button>
        </div>
      </header>

      <section className="inventory-grid">
        <div className="inventory-stat">
          <div className="label">Preferred Vendors</div>
          <div className="value">12</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Avg Lead Time</div>
          <div className="value">4.2 days</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Open Contracts</div>
          <div className="value">6</div>
        </div>
        <div className="inventory-stat">
          <div className="label">On File COIs</div>
          <div className="value">9</div>
        </div>
      </section>

      <section className="inventory-card">
        <div className="inventory-table" style={{ "--inventory-columns": "0.7fr 1.3fr 0.7fr 1fr 1.2fr 0.7fr 0.7fr" }}>
          <div className="inventory-thead">
            <div>ID</div>
            <div>Vendor</div>
            <div>Rating</div>
            <div>Lead Time</div>
            <div>Primary Contact</div>
            <div>Terms</div>
            <div></div>
          </div>
          {VENDORS.map((vendor) => (
            <div key={vendor.id} className="inventory-row">
              <div className="mono">{vendor.id}</div>
              <div>
                <div>{vendor.name}</div>
                <div className="muted">{vendor.category}</div>
              </div>
              <div>{vendor.rating}</div>
              <div>{vendor.leadTime}</div>
              <div>{vendor.contact}</div>
              <div>
                <span className="inventory-pill">{vendor.terms}</span>
              </div>
              <div className="inventory-actions">
                <button className="btn mini secondary">View</button>
                <button className="btn mini">Request Quote</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
