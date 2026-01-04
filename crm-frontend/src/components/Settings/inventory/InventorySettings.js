import React from "react";
import "../SettingsCommon.css";

export default function InventorySettings() {
  return (
    <div className="settings-page">
      <h2>Products & Inventory</h2>
      <p className="muted">Configure stock rules, procurement approvals, and warehouse defaults.</p>

      <div className="settings-card two-col">
        <div>
          <h3>Reorder Rules</h3>
          <label>Low Stock Threshold
            <input defaultValue="15 units" />
          </label>
          <label>Auto-create Draft PO
            <select defaultValue="enabled">
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label>Preferred Warehouse
            <input defaultValue="Main Warehouse" />
          </label>
        </div>
        <div>
          <h3>Approvals</h3>
          <label>PO Approval Threshold
            <input defaultValue="$2,500" />
          </label>
          <label>Approve by Role
            <input defaultValue="Operations Manager" />
          </label>
          <label>Receiving QA Required
            <select defaultValue="yes">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h3>Stock Alert Channels</h3>
        <div className="row">
          <input defaultValue="ops@gulftech.com" />
          <input defaultValue="Slack #inventory-alerts" />
          <button className="mini">Test Alert</button>
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-primary">Save Inventory Settings</button>
        <button className="settings-secondary">Review Audit Log</button>
      </div>
    </div>
  );
}
