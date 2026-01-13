// src/components/Dashboards/Dashboard.js
import React from 'react';
import './Dashboard.css';
import ActivityWidget from './Widgets/ActivityWidget';
import { getUiRegistry } from '../../constants/uiRegistry';

const registry = getUiRegistry('landscaping');

const STAT_SIGNALS = [
  { key: 'jobs_today', label: 'Jobs Today', value: 18, tone: 'info', note: 'Crews dispatched, routes confirmed' },
  { key: 'jobs_behind', label: 'Jobs Behind', value: 3, tone: 'warning', note: 'Delays on Route 2 and 4' },
  { key: 'invoices_pending', label: 'Invoices Pending', value: 7, tone: 'neutral', note: 'Waiting on signatures' },
  { key: 'exceptions', label: 'Exceptions', value: 2, tone: 'danger', note: 'Weather hold + equipment' },
];

const PIPELINE_COUNTS = [
  { stage: registry.pipelineStages[0], count: 9, tone: 'info', meta: 'Routes locked' },
  { stage: registry.pipelineStages[1], count: 6, tone: 'warning', meta: 'Crew ETA < 45m' },
  { stage: registry.pipelineStages[2], count: 4, tone: 'success', meta: 'Pending proof' },
  { stage: registry.pipelineStages[3], count: 3, tone: 'neutral', meta: 'Billing in queue' },
];

const EXCEPTIONS = [
  { title: 'Weather hold', detail: 'Cape Coral — reschedule by 2pm', severity: 'danger' },
  { title: 'Equipment issue', detail: 'Mower down — Crew 3 borrowing backup', severity: 'warning' },
];

const QUICK_ACTIONS = [
  'Push invoice to ACME after photo proof',
  'Re-route Crew 2 to Hodges priority lawn',
  'Summarize exceptions for office handoff',
];

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <section className="stat-grid">
          {STAT_SIGNALS.map((stat) => (
            <article key={stat.key} className={`stat-card tone-${stat.tone}`}>
              <header>
                <span className="stat-label">{stat.label}</span>
              </header>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-note">{stat.note}</div>
            </article>
          ))}
        </section>

        <section className="panel-row">
          <div className="panel card pipeline-panel">
            <header className="panel-header">
              <div>
                <h2>Job Pipeline</h2>
                <p>Fast read on stage load</p>
              </div>
            </header>
            <div className="pipeline-grid">
              {PIPELINE_COUNTS.map((stage) => (
                <div key={stage.stage} className={`pipeline-card tone-${stage.tone}`}>
                  <div className="pipeline-stage">{stage.stage}</div>
                  <div className="pipeline-count">{stage.count}</div>
                  <div className="pipeline-meta">{stage.meta}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel card ai-panel">
            <header className="panel-header">
              <div>
                <h2>AI Ops Assistant</h2>
                <p>Ask for routes, risk, billing</p>
              </div>
            </header>
            <div className="ai-suggestions">
              {QUICK_ACTIONS.map((item) => (
                <div key={item} className="ai-suggestion">{item}</div>
              ))}
            </div>
            <div className="ai-input-row">
              <input type="text" placeholder="Ask: delays, billing, crew routing..." />
              <button className="btn-primary">Send</button>
            </div>
          </div>
        </section>

        <section className="panel-row">
          <div className="panel card exceptions-panel">
            <header className="panel-header">
              <div>
                <h2>Exceptions</h2>
                <p>Resolve before end of day</p>
              </div>
            </header>
            <div className="exceptions-list">
              {EXCEPTIONS.map((ex) => (
                <div key={ex.title} className={`exception-item tone-${ex.severity}`}>
                  <div className="exception-title">{ex.title}</div>
                  <div className="exception-detail">{ex.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel card activity-panel">
            <header className="panel-header">
              <div>
                <h2>Recent Activity</h2>
                <p>Last touch across crews</p>
              </div>
            </header>
            <ActivityWidget />
          </div>
        </section>
      </div>
    </div>
  );
}
