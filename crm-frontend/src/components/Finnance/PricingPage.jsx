import React from "react";
import "./FinancePage.css";

const PLANS = [
  {
    name: "Starter",
    price: "$149/mo",
    desc: "For small teams getting started.",
    features: ["Up to 5 techs", "Basic scheduling", "SMS reminders"],
  },
  {
    name: "Growth",
    price: "$399/mo",
    desc: "Best for growing service teams.",
    features: ["Up to 25 techs", "AI assistant", "Advanced routing", "Templates"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Multi-branch operations.",
    features: ["Unlimited techs", "Custom SLAs", "Dedicated success", "API access"],
  },
];

export default function PricingPage() {
  return (
    <div className="finance-page">
      <header className="finance-head">
        <div>
          <h2>Pricing</h2>
          <p className="finance-muted">Configure internal plan tiers and renewal strategy.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-btn secondary">Edit Add-ons</button>
          <button className="finance-btn">Publish Pricing</button>
        </div>
      </header>

      <section className="finance-card">
        <div className="plan-grid">
          {PLANS.map((plan) => (
            <div key={plan.name} className="plan-card">
              <h4>{plan.name}</h4>
              <div className="plan-price">{plan.price}</div>
              <p className="finance-muted">{plan.desc}</p>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button className="finance-btn secondary">Edit Plan</button>
            </div>
          ))}
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Add-ons & Usage</h3>
          <button className="finance-btn secondary">Configure</button>
        </div>
        <div className="finance-table" style={{ "--finance-columns": "1.6fr 0.9fr 0.9fr 0.9fr" }}>
          <div className="finance-row head">
            <div>Add-on</div>
            <div>Type</div>
            <div>Rate</div>
            <div>Status</div>
          </div>
          {[
            { name: "Extra Technician Seat", type: "Per Seat", rate: "$25/mo", status: "Active" },
            { name: "AI Dispatch Credits", type: "Usage", rate: "$0.04/credit", status: "Active" },
            { name: "Extra Phone Line", type: "Per Line", rate: "$15/mo", status: "Paused" },
          ].map((row) => (
            <div key={row.name} className="finance-row">
              <div>{row.name}</div>
              <div>{row.type}</div>
              <div>{row.rate}</div>
              <div>
                <span className={`finance-pill ${row.status === "Active" ? "success" : "warn"}`}>
                  {row.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
