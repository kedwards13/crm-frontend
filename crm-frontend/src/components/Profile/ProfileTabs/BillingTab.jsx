import React from "react";
import "./BillingTab.css";

export default function BillingTab() {
  return (
    <div className="billing-tab">
      <div className="billing-grid">
        <section className="billing-card billing-summary">
          <header className="billing-card-head">
            <h3>Billing Summary</h3>
            <span className="billing-pill success">In Good Standing</span>
          </header>
          <div className="billing-stats">
            <div>
              <div className="billing-stat-label">Lifetime Value</div>
              <div className="billing-stat-value">$42,980</div>
            </div>
            <div>
              <div className="billing-stat-label">Outstanding Balance</div>
              <div className="billing-stat-value">$1,240</div>
            </div>
            <div>
              <div className="billing-stat-label">Active Plan</div>
              <div className="billing-stat-value">Premier Quarterly</div>
            </div>
          </div>
          <div className="billing-actions">
            <button className="action-btn">Create Invoice</button>
            <button className="action-btn">Record Payment</button>
            <button className="action-btn primary">Send Statement</button>
          </div>
        </section>

        <section className="billing-card">
          <header className="billing-card-head">
            <h3>Payment Methods</h3>
            <button className="action-btn">Add Method</button>
          </header>
          <div className="billing-methods">
            <div className="billing-method">
              <div>
                <div className="billing-method-title">Corporate Visa •••• 4242</div>
                <div className="billing-method-sub">Primary • Expires 08/27</div>
              </div>
              <span className="billing-pill">Auto-pay</span>
            </div>
            <div className="billing-method">
              <div>
                <div className="billing-method-title">ACH - SunTrust •••• 3890</div>
                <div className="billing-method-sub">Backup • Verified</div>
              </div>
              <span className="billing-pill muted">Manual</span>
            </div>
          </div>
        </section>
      </div>

      <section className="billing-card">
        <header className="billing-card-head">
          <h3>Active Subscriptions</h3>
          <button className="action-btn">Manage Plans</button>
        </header>
        <div className="billing-table">
          <div className="billing-table-row billing-table-head">
            <span>Plan</span>
            <span>Status</span>
            <span>Next Bill</span>
            <span>Amount</span>
          </div>
          {[
            {
              plan: "Premier Quarterly",
              status: "Active",
              date: "Jan 15, 2026",
              amount: "$2,400",
            },
            {
              plan: "Reactivation Monitoring",
              status: "Paused",
              date: "—",
              amount: "$320",
            },
          ].map((row) => (
            <div key={row.plan} className="billing-table-row">
              <span>{row.plan}</span>
              <span className={`billing-pill ${row.status === "Active" ? "success" : "muted"}`}>
                {row.status}
              </span>
              <span>{row.date}</span>
              <span>{row.amount}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="billing-card">
        <header className="billing-card-head">
          <h3>Recent Invoices</h3>
          <button className="action-btn">View All</button>
        </header>
        <div className="billing-table">
          <div className="billing-table-row billing-table-head">
            <span>Invoice</span>
            <span>Issued</span>
            <span>Status</span>
            <span>Total</span>
          </div>
          {[
            { id: "INV-3021", issued: "Dec 10, 2025", status: "Paid", total: "$1,240" },
            { id: "INV-3008", issued: "Nov 10, 2025", status: "Paid", total: "$1,240" },
            { id: "INV-2994", issued: "Oct 10, 2025", status: "Due", total: "$1,240" },
          ].map((row) => (
            <div key={row.id} className="billing-table-row">
              <span>{row.id}</span>
              <span>{row.issued}</span>
              <span className={`billing-pill ${row.status === "Paid" ? "success" : "warn"}`}>
                {row.status}
              </span>
              <span>{row.total}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
