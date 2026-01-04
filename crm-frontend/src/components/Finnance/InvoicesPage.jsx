import React from "react";
import "./FinancePage.css";

const INVOICES = [
  { id: "INV-3021", customer: "Maggie Cole", issued: "Dec 10, 2025", due: "Dec 24, 2025", status: "Paid", total: "$1,240" },
  { id: "INV-3008", customer: "Phoenix Realty", issued: "Nov 10, 2025", due: "Nov 24, 2025", status: "Paid", total: "$980" },
  { id: "INV-2994", customer: "Khalis Edwards", issued: "Oct 10, 2025", due: "Oct 24, 2025", status: "Overdue", total: "$1,240" },
];

export default function InvoicesPage() {
  return (
    <div className="finance-page">
      <header className="finance-head">
        <div>
          <h2>Invoices</h2>
          <p className="finance-muted">Track issued invoices, due dates, and collection status.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-btn secondary">Import</button>
          <button className="finance-btn">New Invoice</button>
        </div>
      </header>

      <section className="finance-stat-grid">
        <div className="finance-stat">
          <div className="label">Outstanding</div>
          <div className="value">$18,420</div>
        </div>
        <div className="finance-stat">
          <div className="label">Paid (30d)</div>
          <div className="value">$42,980</div>
        </div>
        <div className="finance-stat">
          <div className="label">Overdue</div>
          <div className="value">$3,240</div>
        </div>
        <div className="finance-stat">
          <div className="label">Avg Days to Pay</div>
          <div className="value">12 days</div>
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Recent Invoices</h3>
          <button className="finance-btn secondary">Download CSV</button>
        </div>
        <div className="finance-table" style={{ "--finance-columns": "0.9fr 1.4fr 1fr 1fr 0.9fr 0.8fr" }}>
          <div className="finance-row head">
            <div>Invoice</div>
            <div>Customer</div>
            <div>Issued</div>
            <div>Due</div>
            <div>Status</div>
            <div>Total</div>
          </div>
          {INVOICES.map((invoice) => (
            <div key={invoice.id} className="finance-row">
              <div className="mono">{invoice.id}</div>
              <div>{invoice.customer}</div>
              <div>{invoice.issued}</div>
              <div>{invoice.due}</div>
              <div>
                <span
                  className={`finance-pill ${
                    invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "danger" : "warn"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
              <div>{invoice.total}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
