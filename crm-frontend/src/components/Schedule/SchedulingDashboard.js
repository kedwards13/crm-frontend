import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CalendarView from './CalendarView';
import AppointmentsView from './AppointmentsView';
import RoutePlanner from './RoutePlanner';
import MapView from './MapView';
import UnscheduledView from './UnscheduledView';
import './SchedulingDashboard.css';

const SchedulingDashboard = () => {
  return (
    <div className="scheduling-dashboard-container">
      <div className="scheduling-content">
        <Routes>
          <Route path="calendar" element={<CalendarView />} />
          <Route path="appointments" element={<AppointmentsView />} />
          <Route path="routing" element={<RoutePlanner />} />
          <Route path="routes" element={<RoutePlanner />} />
          <Route path="map" element={<MapView />} />
          <Route path="unscheduled" element={<UnscheduledView />} />
          <Route path="pool" element={<UnscheduledView />} />
          {/* Default route goes to Calendar */}
          <Route path="*" element={<CalendarView />} />
        </Routes>
      </div>
    </div>
  );
};

export default SchedulingDashboard;
