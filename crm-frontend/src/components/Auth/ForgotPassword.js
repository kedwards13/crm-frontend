import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../apiClient';
import { AuthContext } from '../../App';
import AbonMark from '../../assets/brand/abon-mark.svg';

import './Login.css';
import './ForgotPassword.css';

const RESEND_COOLDOWN_SECONDS = 60;

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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext) || {};

  const [step, setStep] = useState(1); // 1=email, 2=code, 3=password, 4=success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const emailRef = useRef(null);
  const codeRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => { document.body.dataset.theme = e.matches ? 'dark' : 'light'; };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (step === 1) emailRef.current?.focus();
    if (step === 2) codeRef.current?.focus();
    if (step === 3) passwordRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step !== 4) return undefined;
    try { logout?.(); } catch { /* noop */ }
    const t = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [step, navigate, logout]);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })),
    [password]
  );
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordValid = passwordChecks.every((c) => c.ok) && passwordsMatch;

  const handleRequestCode = async (e) => {
    e?.preventDefault?.();
    setError('');
    setInfo('');
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/accounts/auth/forgot-password/', { email: trimmed });
      setInfo('If an account exists for that email, a verification code has been sent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
    } catch (err) {
      setError(extractError(err, 'Unable to send reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await handleRequestCode();
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault?.();
    setError('');
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/accounts/auth/verify-reset-code/', {
        email: email.trim().toLowerCase(),
        code: digits,
      });
      setCode(digits);
      setInfo('');
      setStep(3);
    } catch (err) {
      setError(extractError(err, 'Invalid or expired code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!passwordValid) {
      setError('Password does not meet all requirements.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/accounts/auth/reset-password/', {
        email: email.trim().toLowerCase(),
        code,
        new_password: password,
      });
      setStep(4);
    } catch (err) {
      setError(extractError(err, 'Unable to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (e) => {
    e?.preventDefault?.();
    navigate('/login');
  };

  const renderHeader = (title, subtitle) => (
    <>
      <div className="login-header">
        <div className="login-brand">
          <div className="login-mark">
            <img src={AbonMark} alt="Abon logo" />
          </div>
          <div>
            <p className="login-eyebrow">Abon Command</p>
            <h2 className="login-title">{title}</h2>
          </div>
        </div>
      </div>
      <p className="login-subtitle">{subtitle}</p>
    </>
  );

  return (
    <div className="login-container">
      <div className="login-card">
        {step === 1 && (
          <>
            {renderHeader('Recover Account', 'Enter your work email to receive a verification code.')}
            {error && <div className="error-flash">{error}</div>}
            <form onSubmit={handleRequestCode}>
              <div className="input-stack">
                <input
                  ref={emailRef}
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="Work email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="action-row">
                <button type="submit" className="btn-solid" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
              <div className="help-row">
                <a href="/login" onClick={backToLogin}>Back to Login</a>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            {renderHeader('Enter Code', `We sent a 6-digit code to ${email}.`)}
            {info && <div className="info-flash">{info}</div>}
            {error && <div className="error-flash">{error}</div>}
            <form onSubmit={handleVerifyCode}>
              <div className="input-stack">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className="login-input fp-code-input"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div className="action-row">
                <button type="submit" className="btn-solid" disabled={loading || code.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
              <div className="help-row fp-help-row">
                <button
                  type="button"
                  className="fp-link-btn"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <a href="/login" onClick={backToLogin}>Back to Login</a>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            {renderHeader('New Password', 'Choose a strong password you haven\u2019t used before.')}
            {error && <div className="error-flash">{error}</div>}
            <form onSubmit={handleResetPassword}>
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
                    <span className="fp-rule-dot" aria-hidden="true">{rule.ok ? '✓' : '•'}</span>
                    {rule.label}
                  </li>
                ))}
                <li className={passwordsMatch ? 'fp-rule-ok' : 'fp-rule-pending'}>
                  <span className="fp-rule-dot" aria-hidden="true">{passwordsMatch ? '✓' : '•'}</span>
                  Passwords match
                </li>
              </ul>

              <div className="action-row">
                <button type="submit" className="btn-solid" disabled={loading || !passwordValid}>
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
              </div>
              <div className="help-row">
                <a href="/login" onClick={backToLogin}>Back to Login</a>
              </div>
            </form>
          </>
        )}

        {step === 4 && (
          <>
            {renderHeader('Password Reset', 'Your password has been updated.')}
            <div className="fp-success-block">
              <div className="fp-success-check" aria-hidden="true">✓</div>
              <p className="fp-success-text">Redirecting you to sign in…</p>
            </div>
            <div className="help-row">
              <a href="/login" onClick={backToLogin}>Go to Login now</a>
            </div>
          </>
        )}

        <div className="login-footnote">
          Having trouble? Contact your workspace admin for help recovering access.
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
