import React from "react";
import "../SettingsCommon.css";

const SERVICES = [
  { name: "General Pest Control", duration: "60 min", price: "$129", tier: "Core" },
  { name: "Termite Inspection", duration: "45 min", price: "$89", tier: "Core" },
  { name: "Rodent Exclusion", duration: "120 min", price: "$399", tier: "Add-on" },
];

const TIERS = [
  { name: "Core", margin: "42%", label: "Standard residential services" },
  { name: "Premium", margin: "54%", label: "Commercial + priority response" },
  { name: "Maintenance", margin: "36%", label: "Recurring protection plans" },
];

export default function ServicesPricing() {
  return (
    <div className="settings-page">
      <h2>Services & Pricing</h2>
      <p className="muted">Define your service catalog, pricing tiers, and discount rules.</p>

      <div className="settings-card">
        <h3>Service Catalog</h3>
        <div className="table-like">
          <div className="row header">
            <div>Service</div>
            <div>Duration</div>
            <div>Base Price</div>
            <div>Tier</div>
            <div>Status</div>
            <div></div>
          </div>
          {SERVICES.map((service) => (
            <div key={service.name} className="row">
              <input defaultValue={service.name} />
              <input defaultValue={service.duration} />
              <input defaultValue={service.price} />
              <input defaultValue={service.tier} />
              <select defaultValue="active">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <button className="mini danger">Remove</button>
            </div>
          ))}
        </div>
        <button className="mini">+ Add Service</button>
      </div>

      <div className="settings-card two-col">
        <div>
          <h3>Pricing Tiers</h3>
          {TIERS.map((tier) => (
            <div key={tier.name} className="row">
              <input defaultValue={tier.name} />
              <input defaultValue={tier.margin} />
              <input defaultValue={tier.label} />
            </div>
          ))}
          <button className="mini">Add Tier</button>
        </div>
        <div>
          <h3>Discount Rules</h3>
          <label>Recurring Plan Discount
            <input defaultValue="10%" />
          </label>
          <label>Bundle Discount
            <input defaultValue="15%" />
          </label>
          <label>Seasonal Promo Code
            <input defaultValue="SPRING25" />
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-primary">Save Pricing</button>
        <button className="settings-secondary">Preview Quote</button>
      </div>
    </div>
  );
}
