// src/components/Auth/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import api from '../../apiClient';
import { normalizeIndustry } from '../../helpers/tenantHelpers';
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
      if (normalizedTenants.length === 1) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/select-account', { replace: true });
      }
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
    alert('Google sign-in is not enabled for this account.');
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="hero-top">
          <div className="brand-lockup">
            <div className="brand-mark">
              <span className="brand-lines" aria-hidden="true" />
              <span className="brand-name">CRM</span>
            </div>
            <span className="brand-chip">Account access</span>
          </div>
          <p className="hero-eyebrow">Secure account access</p>
        </div>

        <h1 className="hero-title">Sign in to your account</h1>
        <p className="hero-copy">
          Secure access to your CRM account. Use your company credentials to continue.
        </p>

        <div className="hero-actions">
          <a href="/forgot-password" className="ghost-link">
            Forgot password?
          </a>
          <a href="/signup" className="primary-link">
            Request access
          </a>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-container">
          <div className="form-header">
            <div className="form-badge">CR</div>
            <div>
              <p className="form-eyebrow">Secure sign in</p>
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
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Continue to dashboard'}
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
              <a href="/signup">Request access</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
