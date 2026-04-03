import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppointmentsView from './AppointmentsView';
import RoutePlanner from './RoutePlanner';
import MonthPlanView from './dispatch/MonthPlanView';
import './SchedulingDashboard.css';

const SchedulingDashboard = () => {
  return (
    <div className="scheduling-dashboard-container">
      <div className="scheduling-content">
        <Routes>
          <Route path="calendar" element={<Navigate to="/schedule/day" replace />} />
          <Route path="day" element={<RoutePlanner />} />
          <Route path="range" element={<RoutePlanner />} />
          <Route path="week" element={<Navigate to="/schedule/range" replace />} />
          <Route path="month" element={<RoutePlanner />} />
          <Route path="planner" element={<MonthPlanView />} />
          <Route path="appointments" element={<AppointmentsView />} />
          <Route path="routing" element={<Navigate to="/schedule/day" replace />} />
          <Route path="route-view" element={<Navigate to="/schedule/day" replace />} />
          <Route path="routes" element={<Navigate to="/schedule/month" replace />} />
          <Route path="map" element={<Navigate to="/schedule/day" replace />} />
          <Route path="unscheduled" element={<Navigate to="/schedule/day" replace />} />
          <Route path="pool" element={<Navigate to="/schedule/day" replace />} />
          <Route path="*" element={<Navigate to="/schedule/day" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default SchedulingDashboard;
