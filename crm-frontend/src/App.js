// src/App.js
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import TenantSelector from './components/Auth/TenantSelector';
import TenantSignUp from './components/Auth/TenantSignUp';
import Dashboard from './components/Dashboards/Dashboard';
import DashboardTasks from './components/Dashboards/DashboardTasks';
import DashboardAlerts from './components/Dashboards/DashboardAlerts';
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
import api from './apiClient';

// Helpers
import {
  clearActiveTenant,
  getActiveTenant,
  getStoredTenants,
  persistTenants,
  setActiveTenant,
} from './helpers/tenantHelpers';

// Styles
import './App.css';
import './index.css';

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
  const [isTenantSetupComplete, setTenantSetupComplete] = useState(true);
  const [token, setToken] = useState(
    localStorage.getItem('token') || localStorage.getItem('access_token') || null
  );
  const [user, setUser] = useState(() => safeParse(localStorage.getItem('user'), null));
  const [tenant, setTenant] = useState(() => getActiveTenant() || null);
  const [tenants, setTenants] = useState(() => getStoredTenants());

  const logout = useCallback(() => {
    localStorage.clear();
    setIsAuthenticated(false);
    setTenantSetupComplete(false);
    setToken(null);
    setUser(null);
    setTenant(null);
    setTenants([]);
  }, []);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const fallbackToken = localStorage.getItem('access_token');
      const tokenExpiry = localStorage.getItem('token_expiry');
      const userData = safeParse(localStorage.getItem('user'), null);
      const tenantData = getActiveTenant();
      const storedTenants = getStoredTenants();
      setTenants(storedTenants);

      const accessToken = storedToken || fallbackToken;

      if (accessToken && tokenExpiry) {
        const expiryTime = new Date(tokenExpiry);
        if (expiryTime > new Date()) {
          setIsAuthenticated(true);
          setTenantSetupComplete(tenantData?.setupComplete ?? true);
          setToken(accessToken);
          setUser(userData);
          setTenant(tenantData);
        } else {
          logout();
        }
      }
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const syncTenant = () => setTenant(getActiveTenant());
    const syncTenants = () => setTenants(getStoredTenants());
    const onStorage = (e) => {
      if (e.key === 'activeTenant') syncTenant();
      if (e.key === 'tenants') syncTenants();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('activeTenant:changed', syncTenant);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('activeTenant:changed', syncTenant);
    };
  }, []);

  const login = (accessToken, refreshToken, expiry, tenantList, userData) => {
    const normalizedTenants = persistTenants(tenantList);
    clearActiveTenant();

    localStorage.setItem('token', accessToken || '');
    localStorage.setItem('access_token', accessToken || '');
    if (refreshToken) localStorage.setItem('refresh', refreshToken);
    else localStorage.removeItem('refresh');
    localStorage.setItem('token_expiry', expiry);
    localStorage.setItem('user', JSON.stringify(userData));

    const autoSelect =
      Array.isArray(normalizedTenants) && normalizedTenants.length === 1
        ? normalizedTenants[0]
        : null;
    if (autoSelect?.id) {
      const saved = setActiveTenant(autoSelect);
      setTenant(saved);
      setTenantSetupComplete(saved?.setupComplete ?? true);
    } else {
      clearActiveTenant();
      setTenant(null);
      setTenantSetupComplete(false);
    }

    setIsAuthenticated(true);
    setToken(accessToken || null);
    setUser(userData);
    setTenants(normalizedTenants);
  };

  const selectTenant = async (tenantId) => {
    const tenantList = getStoredTenants();
    const selected = tenantList.find((t) => String(t.id) === String(tenantId));
    if (!selected) throw new Error('Please choose a tenant to continue.');

    const { data } = await api.post('/accounts/auth/switch-tenant/', {
      tenant_id: tenantId,
    });

    const mergedTenant = setActiveTenant({ ...data?.activeTenant, ...selected });
    setTenant(mergedTenant);
    setTenantSetupComplete(mergedTenant?.setupComplete ?? true);
    return mergedTenant;
  };

  return {
    isAuthenticated,
    login,
    logout,
    isTenantSetupComplete,
    token,
    user,
    tenant,
    tenants,
    selectTenant,
    requiresTenantSelection:
      isAuthenticated &&
      (!tenant?.id || (tenants.length > 0 && !tenants.find((t) => String(t.id) === String(tenant.id)))),
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
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/tasks" element={<DashboardTasks />} />
        <Route path="/dashboard/alerts" element={<DashboardAlerts />} />
        <Route path="/customers/*" element={<CustomersPage />} />
        <Route path="/leads/*" element={<LeadsPage />} />
        <Route path="/leads/pipeline" element={<PipelineView />} />
        <Route path="/leads/under-contract" element={<MarketplaceView />} />
        <Route path="/schedule/*" element={<SchedulingDashboard />} />
        <Route path="/communication/*" element={<CommunicationsPage />} />

        {/* Revival */}
        <Route path="/revival/overview" element={<Overview />} />
        <Route path="/revival/scanner" element={<RevivalScanner />} />
        <Route path="/revival/campaigns" element={<Campaigns />} />
        <Route path="/revival/planner" element={<Planner />} />
        <Route path="/revival/history" element={<History />} />
        <Route path="/revival/ai" element={<AiInsights />} />
        <Route path="/revival/*" element={<Navigate to="/revival/overview" replace />} />

        {/* Finance & Marketing */}
        <Route path="/finance/*" element={<FinancePage />} />
        <Route path="/marketing/*" element={<MarketingPage />} />

        <Route path="/analytics/*" element={<AnalyticsPage />} />
        <Route path="/operations/*" element={<OperationsRouter />} />
        <Route path="/settings/team" element={<TeamManagement />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

const TenantSelectionRoutes = () => {
  const navigate = useNavigate();
  const { tenants, selectTenant, logout } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelect = async (tenantId) => {
    if (!tenantId) {
      setError('Select a tenant to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const active = await selectTenant(tenantId);
      const target = active?.setupComplete === false ? '/settings/team' : '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Unable to activate tenant. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Routes>
      <Route
        path="/select-account"
        element={
          <TenantSelector
            tenants={tenants}
            onSelect={handleSelect}
            onLogout={logout}
            loading={loading}
            error={error}
          />
        }
      />
      <Route path="*" element={<Navigate to="/select-account" replace />} />
    </Routes>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, requiresTenantSelection } = useContext(AuthContext);
  if (!isAuthenticated) return <UnauthenticatedRoutes />;
  if (requiresTenantSelection) return <TenantSelectionRoutes />;
  return <AuthenticatedApp />;
};

const App = () => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <Router>

        {/* ⭐⭐⭐ GLOBAL MODAL ROOT — required for CustomerPopup */}
        <div id="modal-root"></div>

        <AppRoutes />

      </Router>
    </AuthContext.Provider>
  );
};

export default App;
