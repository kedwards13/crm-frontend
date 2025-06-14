import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CalendarView from './CalendarView';
import AppointmentsView from './AppointmentsView';
import './SchedulingDashboard.css';

const SchedulingDashboard = () => {
  return (
    <div className="scheduling-dashboard-container">
      <div className="scheduling-content">
        <Routes>
          <Route path="calendar" element={<CalendarView />} />
          <Route path="appointments" element={<AppointmentsView />} />
          {/* Default route goes to Calendar */}
          <Route path="*" element={<CalendarView />} />
        </Routes>
      </div>
    </div>
  );
};

export default SchedulingDashboard;