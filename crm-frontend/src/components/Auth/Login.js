// src/components/Auth/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import api from '../../apiClient';
import { setActiveTenant, normalizeIndustry } from '../../helpers/tenantHelpers';
import { FcGoogle } from 'react-icons/fc';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const domain = email.split('@')[1];

      const { data } = await api.post(
        '/accounts/auth/login/',
        { email, password },
        { headers: { 'X-Tenant-Domain': domain } }
      );

      const access = data?.access;
      const refresh = data?.refresh;
      const expiry = new Date(Date.now() + 3600 * 1000).toISOString();

      const rawTenant = data?.activeTenant || {};
      const user = data?.user || {};

      const nameHint = (rawTenant.name || '').toLowerCase().includes('pest')
        ? 'pest_control'
        : 'general';

      const industry = normalizeIndustry(
        rawTenant.industry || rawTenant.vertical || rawTenant.segment || nameHint
      );

      const normalizedTenant = {
        id: rawTenant.id ?? 'tenant',
        name: rawTenant.name ?? 'Your Company',
        domain: rawTenant.domain,
        industry,
        setupComplete: data?.tenantSetupComplete ?? rawTenant.setupComplete ?? true,
        role: user?.role || 'Member',
        plan: rawTenant.plan || 'base',
        locale: rawTenant.locale || 'en-US',
      };

      // ✅ Save tokens + context
      localStorage.setItem('token', access || '');
      localStorage.setItem('access_token', access || '');
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('token_expiry', expiry);
      localStorage.setItem('user', JSON.stringify(user));

      setActiveTenant(normalizedTenant);
      login(access, refresh, expiry, normalizedTenant, user); // ✅ Added user

      console.log('✅ Logged in as:', user);
      console.log('✅ Tenant context:', normalizedTenant);

      navigate(
        normalizedTenant.setupComplete ? '/dashboard' : '/settings/team',
        { replace: true }
      );
    } catch (err) {
      const detail = err?.response?.data?.detail || '';
      const errorMsg =
        detail.includes('No active account')
          ? 'User not found or incorrect password.'
          : detail ||
            err?.response?.data?.error ||
            err?.message ||
            'Login failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert('Google login coming soon!');
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="hero-top">
          <div className="brand-lockup">
            <div className="brand-mark">
              <span className="brand-lines" aria-hidden="true" />
              <span className="brand-name">ABON</span>
            </div>
            <span className="brand-chip">Operating cloud for accountable teams</span>
          </div>
          <p className="hero-eyebrow">Secure workspace access</p>
        </div>

        <h1 className="hero-title">Sign in to your control center</h1>
        <p className="hero-copy">
          Crisp, resilient access to the ABON stack. Clean lines, fast auth, and a secure
          bridge into your operating cloud.
        </p>

        <div className="hero-actions">
          <a href="https://abon.ai" target="_blank" rel="noreferrer" className="ghost-link">
            Visit abon.ai
          </a>
          <a href="/signup" className="primary-link">
            Request access →
          </a>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-container">
          <div className="form-header">
            <div className="form-badge">AB</div>
            <div>
              <p className="form-eyebrow">Secure workspace login</p>
              <h2 className="form-title">Welcome back</h2>
              <p className="form-subtitle">Use your company email to continue</p>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging In…' : 'Continue to dashboard'}
            </button>

            <div className="alt-login">
              <button
                type="button"
                className="google-login-btn"
                onClick={handleGoogleLogin}
              >
                <FcGoogle /> Sign in with Google
              </button>
            </div>

            <div className="auth-links">
              <a href="/forgot-password">Forgot password?</a>
              <a href="https://abon.ai" target="_blank" rel="noreferrer">
                Create an account at abon.ai
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
