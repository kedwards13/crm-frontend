import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import TenantSignUp from './components/Auth/TenantSignUp';
import Dashboard from './components/Dashboards/Dashboard';
import LeadsPage from './components/Leads/LeadsPage';
import SchedulingDashboard from './components/Schedule/SchedulingDashboard';
import CommunicationsDashboard from './components/Communications/CommunicationsDashboard';
import Settings from './components/Settings/Settings';
import Assistant from './components/Assistant/Assistant';
import PipelineView from './components/Leads/Pipeline';
import MarketplaceView from './components/Marketplace/MarketplaceView';
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import TeamManagement from './components/Settings/TeamManagement';
import FinancePage from './components/Finnance/FinancePage.js';
import MarketingPage from './components/Marketing/MarketingPage';

// **Add this import for your CustomersPage!**
import CustomersPage from './components/Customers/CustomersPage';

import './App.css';
import './themes.css';

export const AuthContext = createContext();

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTenantSetupComplete, setTenantSetupComplete] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setTenantSetupComplete(false);
    setToken(null);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const tenantStr = localStorage.getItem('activeTenant');
    let tenantData = null;
    if (tenantStr && tenantStr !== "undefined") {
      try {
        tenantData = JSON.parse(tenantStr);
      } catch (error) {
        console.error("Error parsing tenant data:", error);
      }
    }
    const tokenExpiry = localStorage.getItem('token_expiry');
    if (storedToken && tokenExpiry) {
      const expiryTime = new Date(tokenExpiry);
      if (expiryTime > new Date()) {
        setIsAuthenticated(true);
        setTenantSetupComplete(tenantData?.setupComplete || false);
        setToken(storedToken);
      } else {
        logout();
      }
    }
  }, []);

  const login = (accessToken, refreshToken, expiry, tenantData) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refresh', refreshToken);
    localStorage.setItem('token_expiry', expiry);
    localStorage.setItem('activeTenant', JSON.stringify(tenantData));

    setIsAuthenticated(true);
    setTenantSetupComplete(tenantData?.setupComplete || false);
    setToken(accessToken);
  };

  return { isAuthenticated, login, logout, isTenantSetupComplete, token };
};

const UnauthenticatedRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<TenantSignUp />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

const AuthenticatedApp = () => {
  const { isTenantSetupComplete } = useContext(AuthContext);
  return (
    <Layout>
      <Routes>
        {isTenantSetupComplete ? (
          <>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Instead of defining each customers route individually,
                we just let /customers/* go to CustomersPage */}
            <Route path="/customers/*" element={<CustomersPage />} />

            <Route path="/leads/*" element={<LeadsPage />} />
            <Route path="/leads/pipeline" element={<PipelineView />} />
            <Route path="/leads/under-contract" element={<MarketplaceView />} />

            
            <Route path="/schedule/*" element={<SchedulingDashboard />} />
            <Route path="/communication/*" element={<CommunicationsDashboard />} />
            <Route path="/settings/team" element={<TeamManagement />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/assistant" element={<Assistant />} />

            <Route
              path="*"
              element={<div style={{ padding: 40 }}>404 - Page Not Found</div>}
            />
          </>
        ) : (
          <>
            <Route path="/settings/team" element={<TeamManagement />} />
            <Route path="*" element={<Navigate to="/settings/team" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
};

const AppRoutes = () => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? <AuthenticatedApp /> : <UnauthenticatedRoutes />;
};

const App = () => {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      <Router>
        <AppRoutes />
      </Router>
    </AuthContext.Provider>
  );
};

export default App;