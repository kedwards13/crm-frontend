import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../apiClient';
import { AuthContext } from '../../App';
import { normalizeIndustry } from '../../helpers/tenantHelpers';

import './Login.css';

const getLoginErrorMessage = (error) => {
  const status = Number(error?.status || error?.response?.status || 0);
  const code = String(error?.code || '').toUpperCase();

  if (status === 401) {
    return 'Invalid email or password.';
  }
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return 'Login timed out. Please try again.';
  }
  if (code === 'ERR_NETWORK') {
    return 'Unable to reach the server. Please try again.';
  }
  return error?.message || 'Login failed. Please try again.';
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleTheme = (e) => {
      document.body.dataset.theme = e.matches ? 'dark' : 'light';
    };
    handleTheme(mediaQuery);
    mediaQuery.addEventListener('change', handleTheme);
    return () => mediaQuery.removeEventListener('change', handleTheme);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('login_remember');
    if (saved === 'true') {
      setRememberMe(true);
      const savedEmail = localStorage.getItem('login_email');
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/accounts/auth/login/', { email, password });

      const access = data?.access;
      const refresh = data?.refresh;
      const expiry = new Date(Date.now() + 3600 * 1000).toISOString();
      const user = data?.user || {};
      const tenantList = Array.isArray(data?.tenants) ? data.tenants : [];
      const normalizedTenants = tenantList
        .map((tenant) => ({
          id: tenant?.id || tenant?.tenant_id || null,
          name: tenant?.name || 'Account',
          domain: tenant?.domain,
          industry: normalizeIndustry(tenant?.industry || tenant?.vertical || tenant?.segment),
          setupComplete: tenant?.setupComplete ?? tenant?.setup_complete ?? true,
          role: tenant?.role || user?.role || 'Member',
          plan: tenant?.plan || 'base',
          locale: tenant?.locale || 'en-US',
        }))
        .filter((tenant) => tenant.id);

      if (rememberMe) {
        localStorage.setItem('login_remember', 'true');
        localStorage.setItem('login_email', email);
      } else {
        localStorage.removeItem('login_remember');
        localStorage.removeItem('login_email');
      }

      login(access, refresh, expiry, normalizedTenants, user);

      if (data.must_change_password) {
        localStorage.setItem('must_change_password', 'true');
        navigate('/change-password', { replace: true });
        return;
      }

      navigate(normalizedTenants.length === 1 ? '/dashboard' : '/select-account', { replace: true });
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-column">

        {/* Brand */}
        <div className="login-brand">
          <h1 className="login-wordmark">
            <span className="wm-ab">Ab</span>
            <span className="wm-on">on</span>
          </h1>
          <p className="login-acronym">Autonomous Business Operating Network</p>
        </div>

        {/* Card */}
        <div className="login-card">
          <h2 className="card-title">Sign in</h2>
          <p className="card-subtitle">Enter your credentials to continue</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="field-stack">
              <input
                type="email"
                className="login-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoFocus
              />
              <input
                type="password"
                className="login-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            <div className="options-row">
              <label className="remember-toggle">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="toggle-track" />
                <span className="remember-text">Remember me</span>
              </label>
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in\u2026' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Tagline */}
        <p className="login-tagline">The AI-powered platform that runs your business end to end</p>
      </div>
    </div>
  );
};

export default Login;
