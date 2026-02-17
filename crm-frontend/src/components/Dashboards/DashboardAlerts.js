// src/components/Dashboards/DashboardAlerts.js
import React from 'react';
import './Dashboard.css';

/**
 * @typedef {Object} AlertItem
 * @property {string|number} id
 * @property {string} title
 * @property {string} detail
 * @property {'info'|'warning'|'danger'} severity
 * @property {string} timestamp
 */

/** @type {AlertItem[]} */
const ALERTS = [
  {
    id: 'a-201',
    title: 'Weather hold',
    detail: 'Cape Coral — reschedule crews before 2pm.',
    severity: 'warning',
    timestamp: '10:05 AM',
  },
  {
    id: 'a-202',
    title: 'Route delay',
    detail: 'Route 2 is 25 mins behind; notify customers.',
    severity: 'danger',
    timestamp: '9:50 AM',
  },
  {
    id: 'a-203',
    title: 'Invoice pending',
    detail: 'ACME invoice awaiting signature.',
    severity: 'info',
    timestamp: '9:15 AM',
  },
];

const SEVERITY_CLASS = {
  info: 'tone-info',
  warning: 'tone-warning',
  danger: 'tone-danger',
};

export default function DashboardAlerts() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <section className="panel card exceptions-panel">
          <header className="panel-header">
            <div>
              <h2>Alerts</h2>
              <p>Operational signals that need attention</p>
            </div>
          </header>

          <div className="exceptions-list">
            {ALERTS.map((alert) => (
              <div key={alert.id} className={`exception-item ${SEVERITY_CLASS[alert.severity] || ''}`}>
                <div className="exception-title">{alert.title}</div>
                <div className="exception-detail">
                  {alert.detail} · {alert.timestamp}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
