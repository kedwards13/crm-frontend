import React from "react";
import "../SettingsCommon.css";

export default function CommsSettings() {
  return (
    <div className="settings-page">
      <h2>Phone, SMS & Email</h2>
      <p className="muted">Configure outbound numbers, brand voice, and delivery settings.</p>

      <div className="settings-card two-col">
        <div>
          <h3>Voice & SMS</h3>
          <label>Primary Caller ID
            <input defaultValue="+1 (813) 555-1122" />
          </label>
          <label>Fallback Number
            <input defaultValue="+1 (813) 555-4401" />
          </label>
          <label>Auto-response Window
            <input defaultValue="8:00 AM – 7:00 PM" />
          </label>
        </div>
        <div>
          <h3>Email Sending</h3>
          <label>From Address
            <input defaultValue="support@gulftech.com" />
          </label>
          <label>Reply-To
            <input defaultValue="hello@gulftech.com" />
          </label>
          <label>Tracking
            <select defaultValue="enabled">
              <option value="enabled">Open + Click Tracking</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h3>Message Templates</h3>
        <div className="table-like">
          <div className="row header">
            <div>Template</div>
            <div>Channel</div>
            <div>Owner</div>
            <div>Status</div>
            <div></div>
            <div></div>
          </div>
          {[
            { name: "New Lead Follow-up", channel: "SMS", owner: "Sales Ops", status: "Active" },
            { name: "Appointment Reminder", channel: "SMS", owner: "Dispatch", status: "Active" },
            { name: "Post-Service Review", channel: "Email", owner: "Marketing", status: "Draft" },
          ].map((row) => (
            <div key={row.name} className="row">
              <input defaultValue={row.name} />
              <input defaultValue={row.channel} />
              <input defaultValue={row.owner} />
              <select defaultValue={row.status}>
                <option>Active</option>
                <option>Draft</option>
              </select>
              <button className="mini">Edit</button>
              <button className="mini danger">Archive</button>
            </div>
          ))}
        </div>
        <button className="mini">+ New Template</button>
      </div>

      <div className="settings-actions">
        <button className="settings-primary">Save Comms Settings</button>
        <button className="settings-secondary">Send Test Message</button>
      </div>
    </div>
  );
}
