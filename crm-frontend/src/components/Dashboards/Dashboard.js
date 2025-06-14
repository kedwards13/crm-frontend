// src/components/Dashboard.js
import React from 'react';
import './Dashboard.css';
import AiAssistantWidget from './Widgets/AiAssistantWidget';
import FinancialWidget from './Widgets/FinancialWidget';
import PipelineWidget from './Widgets/PipelineWidget';
import ActivityWidget from './Widgets/ActivityWidget';

const Dashboard = () => {
  return (
    <div className="layout-content"> {/* Unified layout wrapper */}
      <div className="dashboard-container">
        {/* Top Row: Financial Metrics (left) and AI Assistant (right) */}
        <div className="dash-row top-row">
          <div className="dash-col financial-col">
            <FinancialWidget />
          </div>
          <div className="dash-col assistant-col">
            <AiAssistantWidget />
          </div>
        </div>

        {/* Pipeline Section */}
        <div className="dash-row">
          <h2 className="section-header">Pipeline</h2>
          <div className="pipeline-row">
            <PipelineWidget status="New" />
            <PipelineWidget status="Qualified" />
            <PipelineWidget status="Proposed" />
            <PipelineWidget status="Closed" />
          </div>
        </div>

        {/* Activity Section */}
        <div className="dash-row">
          <h2 className="section-header">Recent Activity</h2>
          <div className="dash-col activity-col">
            <ActivityWidget />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;