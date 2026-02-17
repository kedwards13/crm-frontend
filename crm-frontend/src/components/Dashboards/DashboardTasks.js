// src/components/Dashboards/DashboardTasks.js
import React from 'react';
import './Dashboard.css';

/**
 * @typedef {Object} TaskItem
 * @property {string|number} id
 * @property {string} title
 * @property {string} due
 * @property {'open'|'in_progress'|'blocked'|'done'} status
 * @property {string} owner
 * @property {string} related
 */

/** @type {TaskItem[]} */
const TASKS = [
  {
    id: 't-101',
    title: 'Call ACME to confirm invoice signature',
    due: 'Today, 4:30 PM',
    status: 'open',
    owner: 'Ops',
    related: 'Invoice #4821',
  },
  {
    id: 't-102',
    title: 'Schedule crew for Hodges lawn follow-up',
    due: 'Tomorrow, 9:00 AM',
    status: 'in_progress',
    owner: 'Dispatch',
    related: 'Hodges Landscaping',
  },
  {
    id: 't-103',
    title: 'Send proof of service to SunPest',
    due: 'Tomorrow, 1:00 PM',
    status: 'blocked',
    owner: 'Billing',
    related: 'SunPest',
  },
  {
    id: 't-104',
    title: 'Log exception for Route 2 delay',
    due: 'Today, 5:00 PM',
    status: 'open',
    owner: 'Ops',
    related: 'Route 2',
  },
];

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
};

const STATUS_TONE = {
  open: 'tone-info',
  in_progress: 'tone-warning',
  blocked: 'tone-danger',
  done: 'tone-success',
};

export default function DashboardTasks() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <section className="panel card">
          <header className="panel-header">
            <div>
              <h2>Tasks</h2>
              <p>Action items that keep today running smoothly</p>
            </div>
          </header>

          <div className="exceptions-list">
            {TASKS.map((task) => (
              <div key={task.id} className={`exception-item ${STATUS_TONE[task.status] || ''}`}>
                <div className="exception-title">{task.title}</div>
                <div className="exception-detail">
                  <span>{STATUS_LABEL[task.status] || task.status}</span> · <span>{task.due}</span>
                  {task.owner ? <> · <span>{task.owner}</span></> : null}
                  {task.related ? <> · <span>{task.related}</span></> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
