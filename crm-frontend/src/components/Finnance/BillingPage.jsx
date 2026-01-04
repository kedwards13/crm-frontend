import React from "react";
import "./FinancePage.css";

export default function BillingPage() {
  return (
    <div className="finance-page">
      <header className="finance-head">
        <div>
          <h2>Billing</h2>
          <p className="finance-muted">Payment methods, tax configuration, and invoice preferences.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-btn secondary">Add Payment Method</button>
          <button className="finance-btn">Update Billing Info</button>
        </div>
      </header>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Payment Methods</h3>
          <button className="finance-btn secondary">Set Default</button>
        </div>
        <div className="finance-table" style={{ "--finance-columns": "1.4fr 1fr 1fr 0.8fr" }}>
          <div className="finance-row head">
            <div>Method</div>
            <div>Type</div>
            <div>Status</div>
            <div>Expires</div>
          </div>
          {[
            { method: "Corporate Visa •••• 4242", type: "Card", status: "Default", expires: "08/27" },
            { method: "ACH - SunTrust •••• 3890", type: "Bank", status: "Backup", expires: "—" },
          ].map((row) => (
            <div key={row.method} className="finance-row">
              <div>{row.method}</div>
              <div>{row.type}</div>
              <div>
                <span className={`finance-pill ${row.status === "Default" ? "success" : "warn"}`}>
                  {row.status}
                </span>
              </div>
              <div>{row.expires}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Billing Profile</h3>
          <button className="finance-btn secondary">Edit</button>
        </div>
        <div className="finance-table" style={{ "--finance-columns": "1.2fr 1.2fr 1fr" }}>
          <div className="finance-row head">
            <div>Billing Contact</div>
            <div>Address</div>
            <div>Tax ID</div>
          </div>
          <div className="finance-row">
            <div>GulfTech Finance • finance@gulftech.com</div>
            <div>401 Harbor Ave, Tampa, FL</div>
            <div>98-7654321</div>
          </div>
        </div>
      </section>
    </div>
  );
}
