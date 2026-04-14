import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../apiClient';
import AbonMark from '../../assets/brand/abon-mark.svg';

import './Login.css';
import './ForgotPassword.css';

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'number', label: 'One number', test: (pw) => /\d/.test(pw) },
];

const extractError = (err, fallback) =>
  err?.response?.data?.detail ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

const ChangePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => { document.body.dataset.theme = e.matches ? 'dark' : 'light'; };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => { passwordRef.current?.focus(); }, []);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })),
    [password]
  );
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordValid = passwordChecks.every((c) => c.ok) && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!passwordValid) { setError('Password does not meet all requirements.'); return; }
    setLoading(true);
    try {
      await api.post('/accounts/auth/change-password/', { new_password: password });
      localStorage.removeItem('must_change_password');
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      setError(extractError(err, 'Unable to update password. Please try again.'));
    } finally {
      setLoading(false);
    }
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
              <h2 className="login-title">{done ? 'Password Updated' : 'Set New Password'}</h2>
            </div>
          </div>
        </div>

        {done ? (
          <div className="fp-success-block">
            <div className="fp-success-check" aria-hidden="true">{'\u2713'}</div>
            <p className="fp-success-text">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <p className="login-subtitle">Your admin created your account. Please set a new password to continue.</p>
            {error && <div className="error-flash">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="input-stack">
                <div className="fp-password-row">
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="New password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="fp-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <ul className="fp-rules">
                {passwordChecks.map((rule) => (
                  <li key={rule.key} className={rule.ok ? 'fp-rule-ok' : 'fp-rule-pending'}>
                    <span className="fp-rule-dot" aria-hidden="true">{rule.ok ? '\u2713' : '\u2022'}</span>
                    {rule.label}
                  </li>
                ))}
                <li className={passwordsMatch ? 'fp-rule-ok' : 'fp-rule-pending'}>
                  <span className="fp-rule-dot" aria-hidden="true">{passwordsMatch ? '\u2713' : '\u2022'}</span>
                  Passwords match
                </li>
              </ul>
              <div className="action-row">
                <button type="submit" className="btn-solid" disabled={loading || !passwordValid}>
                  {loading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
