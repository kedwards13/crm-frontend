import React from "react";
import "./FinancePage.css";

const SUBSCRIPTIONS = [
  { name: "Premier Quarterly", status: "Active", seats: "18 techs", renewal: "Jan 15, 2026", mrr: "$2,400" },
  { name: "AI Lead Revival", status: "Active", seats: "Unlimited", renewal: "Jan 02, 2026", mrr: "$890" },
  { name: "Dispatch Pro", status: "Paused", seats: "10 techs", renewal: "—", mrr: "$450" },
];

export default function SubscriptionsPage() {
  return (
    <div className="finance-page">
      <header className="finance-head">
        <div>
          <h2>Subscriptions</h2>
          <p className="finance-muted">Manage recurring plans, seats, and renewal cadence.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-btn secondary">Preview Invoice</button>
          <button className="finance-btn">Create Subscription</button>
        </div>
      </header>

      <section className="finance-stat-grid">
        <div className="finance-stat">
          <div className="label">Active Subscriptions</div>
          <div className="value">9</div>
        </div>
        <div className="finance-stat">
          <div className="label">Monthly Recurring Revenue</div>
          <div className="value">$12,480</div>
        </div>
        <div className="finance-stat">
          <div className="label">Churn Risk</div>
          <div className="value">2 accounts</div>
        </div>
        <div className="finance-stat">
          <div className="label">Upgrades Pending</div>
          <div className="value">3</div>
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Active Plans</h3>
          <button className="finance-btn secondary">Manage Seats</button>
        </div>
        <div className="finance-table" style={{ "--finance-columns": "1.5fr 0.9fr 0.9fr 1fr 0.8fr" }}>
          <div className="finance-row head">
            <div>Plan</div>
            <div>Status</div>
            <div>Seats</div>
            <div>Renewal</div>
            <div>MRR</div>
          </div>
          {SUBSCRIPTIONS.map((plan) => (
            <div key={plan.name} className="finance-row">
              <div>{plan.name}</div>
              <div>
                <span className={`finance-pill ${plan.status === "Active" ? "success" : "warn"}`}>
                  {plan.status}
                </span>
              </div>
              <div>{plan.seats}</div>
              <div>{plan.renewal}</div>
              <div>{plan.mrr}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
