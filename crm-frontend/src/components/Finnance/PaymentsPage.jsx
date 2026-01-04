import React from "react";
import "./FinancePage.css";

const PAYMENTS = [
  { id: "PMT-1184", method: "Card •••• 4242", amount: "$1,240", status: "Completed", date: "Dec 11, 2025" },
  { id: "PMT-1179", method: "ACH •••• 3890", amount: "$980", status: "Pending", date: "Dec 09, 2025" },
  { id: "PMT-1175", method: "Card •••• 0192", amount: "$320", status: "Failed", date: "Dec 08, 2025" },
];

export default function PaymentsPage() {
  return (
    <div className="finance-page">
      <header className="finance-head">
        <div>
          <h2>Payments</h2>
          <p className="finance-muted">Monitor payment activity, refunds, and processing status.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-btn secondary">Refund</button>
          <button className="finance-btn">Record Payment</button>
        </div>
      </header>

      <section className="finance-stat-grid">
        <div className="finance-stat">
          <div className="label">Processed (30d)</div>
          <div className="value">$48,120</div>
        </div>
        <div className="finance-stat">
          <div className="label">Pending</div>
          <div className="value">$2,110</div>
        </div>
        <div className="finance-stat">
          <div className="label">Failed</div>
          <div className="value">$640</div>
        </div>
        <div className="finance-stat">
          <div className="label">Refunds</div>
          <div className="value">$180</div>
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Recent Payments</h3>
          <button className="finance-btn secondary">Export</button>
        </div>
        <div className="finance-table" style={{ "--finance-columns": "0.9fr 1.4fr 0.8fr 0.9fr 0.9fr" }}>
          <div className="finance-row head">
            <div>Payment</div>
            <div>Method</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {PAYMENTS.map((payment) => (
            <div key={payment.id} className="finance-row">
              <div className="mono">{payment.id}</div>
              <div>{payment.method}</div>
              <div>{payment.amount}</div>
              <div>
                <span
                  className={`finance-pill ${
                    payment.status === "Completed"
                      ? "success"
                      : payment.status === "Failed"
                      ? "danger"
                      : "warn"
                  }`}
                >
                  {payment.status}
                </span>
              </div>
              <div>{payment.date}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
