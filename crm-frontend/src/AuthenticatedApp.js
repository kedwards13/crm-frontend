// src/App.js (AuthenticatedApp portion)
import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard';
import CustomersPage from './components/Customers/CustomersPage';
import LeadsPage from './components/Leads/LeadsPage';
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import SchedulingDashboard from './components/Schedule/SchedulingDashboard';
import CommunicationsDashboard from './components/Communications/CommunicationsDashboard';
import Settings from './components/Settings/Settings';
import TeamManagement from './components/Settings/TeamManagement';
import FinancePage from './components/Finnance/FinancePage';
import MarketingPage from './components/Marketing/MarketingPage';
import { AuthContext } from './App';

const AuthenticatedApp = () => {
  const { isTenantSetupComplete } = useContext(AuthContext);
  console.log('Rendering AuthenticatedApp. Tenant setup complete:', isTenantSetupComplete);
  return (
    <Routes>
      {isTenantSetupComplete ? (
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customers/*" element={<CustomersPage />} />
          <Route path="leads/*" element={<LeadsPage />} />
          <Route path="schedule/*" element={<SchedulingDashboard />} />
          <Route path="communication/*" element={<CommunicationsDashboard />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings/team" element={<TeamManagement />} />
          <Route path="settings/*" element={<Settings />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Route>
      ) : (
        <>
          <Route path="/settings/team" element={<TeamManagement />} />
          <Route path="*" element={<Navigate to="/settings/team" replace />} />
        </>
      )}
    </Routes>
  );
};

export default AuthenticatedApp;