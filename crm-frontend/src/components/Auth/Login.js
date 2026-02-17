import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';

import api from '../../apiClient';
import { AuthContext } from '../../App';
import { normalizeIndustry } from '../../helpers/tenantHelpers';
import AbonMark from '../../assets/brand/abon-mark.svg';

import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      login(access, refresh, expiry, normalizedTenants, user);
      navigate(normalizedTenants.length === 1 ? '/dashboard' : '/select-account', { replace: true });
    } catch (err) {
      setError('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert('Google sign-in is not enabled for this account.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="login-mark">
              <img src={AbonMark} alt="Abon logo" />
            </div>
            <div>
              <p className="login-eyebrow">Abon Command</p>
              <h2 className="login-title">Secure Access</h2>
            </div>
          </div>
        </div>
        <p className="login-subtitle">Enter your credentials to access the command center.</p>

        {error && <div className="error-flash">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-stack">
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
              required
              autoFocus
            />
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          <div className="action-row">
            <button type="submit" className="btn-solid" disabled={loading}>
              {loading ? 'Verifying...' : 'Continue'}
            </button>
            <button type="button" className="btn-ghost" onClick={handleGoogleLogin} aria-label="Sign in with Google">
              <FcGoogle size={18} />
              Continue with Google
            </button>
          </div>

          <div className="help-row">
            <a href="/forgot-password">Recover Account</a>
          </div>
        </form>

        <div className="login-footnote">Single sign-on available for managed tenants.</div>
      </div>
    </div>
  );
};

export default Login;
