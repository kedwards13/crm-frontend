import React from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import AppointmentsView from './AppointmentsView';
import RoutePlanner from './RoutePlanner';
import MonthPlanView from './dispatch/MonthPlanView';
import './SchedulingDashboard.css';

const TABS = [
  { label: 'Dispatch', to: '/schedule/day' },
  { label: 'Month Planner', to: '/schedule/planner' },
  { label: 'Job Pool', to: '/schedule/pool' },
];

function ScheduleSubNav() {
  const location = useLocation();
  const path = location.pathname;

  // Determine which tab is active based on current path
  const activeTab = path.includes('/planner') ? 1
    : path.includes('/pool') ? 2
    : 0; // dispatch is default

  return (
    <nav className="sched-subnav">
      {TABS.map((tab, i) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={`sched-subnav-tab ${i === activeTab ? 'sched-subnav-tab-active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

const SchedulingDashboard = () => {
  return (
    <div className="scheduling-dashboard-container">
      <ScheduleSubNav />
      <div className="scheduling-content">
        <Routes>
          <Route path="calendar" element={<Navigate to="/schedule/day" replace />} />
          <Route path="day" element={<RoutePlanner />} />
          <Route path="range" element={<RoutePlanner />} />
          <Route path="week" element={<Navigate to="/schedule/range" replace />} />
          <Route path="month" element={<RoutePlanner />} />
          <Route path="planner" element={<MonthPlanView />} />
          <Route path="appointments" element={<AppointmentsView />} />
          <Route path="pool" element={<JobPoolPlaceholder />} />
          <Route path="routing" element={<Navigate to="/schedule/day" replace />} />
          <Route path="route-view" element={<Navigate to="/schedule/day" replace />} />
          <Route path="routes" element={<Navigate to="/schedule/month" replace />} />
          <Route path="map" element={<Navigate to="/schedule/day" replace />} />
          <Route path="unscheduled" element={<Navigate to="/schedule/pool" replace />} />
          <Route path="*" element={<Navigate to="/schedule/day" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function JobPoolPlaceholder() {
  return (
    <div className="sched-placeholder">
      <h3>Job Pool</h3>
      <p>Unscheduled and overdue jobs will appear here — filterable by due date, service type, tech eligibility, and customer constraints.</p>
    </div>
  );
}

export default SchedulingDashboard;
