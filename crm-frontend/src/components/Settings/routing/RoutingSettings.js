import React from "react";
import "../SettingsCommon.css";

export default function RoutingSettings() {
  return (
    <div className="settings-page">
      <h2>Scheduling & Routing</h2>
      <p className="muted">Configure service windows, travel buffers, and dispatch rules.</p>

      <div className="settings-card two-col">
        <div>
          <h3>Business Hours</h3>
          <label>Weekdays
            <input defaultValue="Mon–Fri" />
          </label>
          <label>Saturday
            <input defaultValue="8:00 AM – 2:00 PM" />
          </label>
          <label>Sunday
            <input defaultValue="Closed" />
          </label>
        </div>
        <div>
          <h3>Dispatch Rules</h3>
          <label>Default Appointment Duration
            <input defaultValue="60 minutes" />
          </label>
          <label>Travel Buffer
            <input defaultValue="15 minutes" />
          </label>
          <label>Max Daily Jobs per Tech
            <input defaultValue="8" />
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h3>Service Areas</h3>
        <div className="table-like">
          <div className="row header">
            <div>Region</div>
            <div>Zip Codes</div>
            <div>Priority</div>
            <div>Routing Note</div>
            <div></div>
            <div></div>
          </div>
          {[
            { region: "North Tampa", zips: "33602, 33603, 33604", priority: "High", note: "Route first" },
            { region: "St. Pete", zips: "33701, 33702, 33703", priority: "Medium", note: "Group by weekday" },
          ].map((row) => (
            <div key={row.region} className="row">
              <input defaultValue={row.region} />
              <input defaultValue={row.zips} />
              <select defaultValue={row.priority}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <input defaultValue={row.note} />
              <button className="mini">Edit</button>
              <button className="mini danger">Remove</button>
            </div>
          ))}
        </div>
        <button className="mini">+ Add Region</button>
      </div>

      <div className="settings-actions">
        <button className="settings-primary">Save Routing</button>
        <button className="settings-secondary">Run Simulation</button>
      </div>
    </div>
  );
}
