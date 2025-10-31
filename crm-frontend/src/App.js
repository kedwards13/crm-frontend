// src/App.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import TenantSignUp from './components/Auth/TenantSignUp';
import Dashboard from './components/Dashboards/Dashboard';
import LeadsPage from './components/Leads/LeadsPage';
import SchedulingDashboard from './components/Schedule/SchedulingDashboard';
import CommunicationsPage from './components/Communications/CommunicationsPage';
import Settings from './components/Settings/Settings';
import Assistant from './components/Assistant/Assistant';
import PipelineView from './components/Leads/Pipeline';
import MarketplaceView from './components/Marketplace/MarketplaceView';
import Campaigns from './components/Revival/Campaigns';
import Planner from './components/Revival/Planner';
import History from './components/Revival/History';
import AiInsights from './components/Revival/AiInsights';
import RevivalScanner from './components/Revival/Scanner';
import Overview from './components/Revival/Overview';
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import FinancePage from './components/Finnance/FinancePage';
import MarketingPage from './components/Marketing/MarketingPage';
import CustomersPage from './components/Customers/CustomersPage';
import TeamManagement from './components/Settings/TeamManagement';
import OperationsRouter from './components/Operations/OperationsRouter';

// Helpers
import { setActiveTenant, getActiveTenant } from './helpers/tenantHelpers';

import './App.css';
import './themes.css';
import './index.css'; // or './App.css'

export const AuthContext = createContext();

function safeParse(json, fallback = null) {
  try {
    return JSON.parse(json ?? '');
  } catch {
    return fallback;
  }
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTenantSetupComplete, setTenantSetupComplete] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => safeParse(localStorage.getItem('user'), null));
  const [tenant, setTenant] = useState(() => getActiveTenant() || null);

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setTenantSetupComplete(false);
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const tokenExpiry = localStorage.getItem('token_expiry');
      const userData = safeParse(localStorage.getItem('user'), null);
      const tenantData = getActiveTenant();

      if (storedToken && tokenExpiry) {
        const expiryTime = new Date(tokenExpiry);
        if (expiryTime > new Date()) {
          setIsAuthenticated(true);
          setTenantSetupComplete(tenantData?.setupComplete || false);
          setToken(storedToken);
          setUser(userData);
          setTenant(tenantData);
        } else {
          logout();
        }
      }
    } catch {
      logout();
    }
  }, []);

  const login = (accessToken, refreshToken, expiry, tenantData, userData) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refresh', refreshToken);
    localStorage.setItem('token_expiry', expiry);
    localStorage.setItem('user', JSON.stringify(userData));
    setActiveTenant(tenantData);

    const normalizedTenant = getActiveTenant();

    setIsAuthenticated(true);
    setTenantSetupComplete(normalizedTenant?.setupComplete || false);
    setToken(accessToken);
    setUser(userData);
    setTenant(normalizedTenant);
  };

  return {
    isAuthenticated,
    login,
    logout,
    isTenantSetupComplete,
    token,
    user,
    tenant,
  };
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
            <Route path="/customers/*" element={<CustomersPage />} />
            <Route path="/leads/*" element={<LeadsPage />} />
            <Route path="/leads/pipeline" element={<PipelineView />} />
            <Route path="/leads/under-contract" element={<MarketplaceView />} />
            <Route path="/schedule/*" element={<SchedulingDashboard />} />
            <Route path="/communication/*" element={<CommunicationsPage />} />

            {/* ✅ Revival Section */}
            <Route path="/revival/overview" element={<Overview />} />
            <Route path="/revival/scanner" element={<RevivalScanner />} />
            <Route path="/revival/campaigns" element={<Campaigns />} />
            <Route path="/revival/planner" element={<Planner />} />
            <Route path="/revival/history" element={<History />} />
            <Route path="/revival/ai" element={<AiInsights />} />
            <Route path="/revival/*" element={<Navigate to="/revival/overview" replace />} />

            {/* ✅ Finance & Marketing */}
            <Route path="/finance/*" element={<FinancePage />} />
            <Route path="/marketing/*" element={<MarketingPage />} />

            <Route path="/analytics/*" element={<AnalyticsPage />} />
            <Route path="/operations/*" element={<OperationsRouter />} />
            <Route path="/settings/team" element={<TeamManagement />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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