import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../apiClient';
import { AuthContext } from '../../App';

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

  const [step, setStep] = useState(1);
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
    if (!trimmed) { setError('Enter your email address.'); return; }
    setLoading(true);
    try {
      await api.post('/accounts/auth/forgot-password/', { email: trimmed });
      setInfo('If an account exists for that email, a verification code has been sent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
    } catch (err) {
      setError(extractError(err, 'Unable to send reset code. Please try again.'));
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await handleRequestCode();
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault?.();
    setError('');
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
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
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!passwordValid) { setError('Password does not meet all requirements.'); return; }
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
    } finally { setLoading(false); }
  };

  const backToLogin = (e) => { e?.preventDefault?.(); navigate('/login'); };

  /* Shared card title for each step */
  const stepConfig = {
    1: { title: 'Reset password', sub: 'Enter your email to receive a verification code.' },
    2: { title: 'Enter code', sub: `We sent a 6-digit code to ${email}.` },
    3: { title: 'New password', sub: 'Choose a strong password you haven\u2019t used before.' },
    4: { title: 'All set', sub: 'Your password has been updated.' },
  };

  const { title, sub } = stepConfig[step];

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
          <h2 className="card-title">{title}</h2>
          <p className="card-subtitle">{sub}</p>

          {info && <div className="fp-info">{info}</div>}
          {error && <div className="login-error">{error}</div>}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleRequestCode}>
              <div className="field-stack">
                <input
                  ref={emailRef}
                  type="email"
                  className="login-field"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                />
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Sending\u2026' : 'Send code'}
              </button>
              <div className="fp-back-row">
                <a href="/login" onClick={backToLogin} className="forgot-link">Back to sign in</a>
              </div>
            </form>
          )}

          {/* Step 2: Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode}>
              <div className="field-stack">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className="login-field fp-code-input"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <button type="submit" className="login-btn" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying\u2026' : 'Verify code'}
              </button>
              <div className="fp-back-row fp-back-row-split">
                <button
                  type="button"
                  className="fp-resend-btn"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
                <a href="/login" onClick={backToLogin} className="forgot-link">Back to sign in</a>
              </div>
            </form>
          )}

          {/* Step 3: New password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="field-stack">
                <div className="fp-password-row">
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    className="login-field"
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
                  className="login-field"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <ul className="fp-rules">
                {passwordChecks.map((rule) => (
                  <li key={rule.key} className={rule.ok ? 'fp-rule-ok' : ''}>
                    <span className="fp-rule-dot">{rule.ok ? '\u2713' : '\u2022'}</span>
                    {rule.label}
                  </li>
                ))}
                <li className={passwordsMatch ? 'fp-rule-ok' : ''}>
                  <span className="fp-rule-dot">{passwordsMatch ? '\u2713' : '\u2022'}</span>
                  Passwords match
                </li>
              </ul>

              <button type="submit" className="login-btn" disabled={loading || !passwordValid}>
                {loading ? 'Updating\u2026' : 'Reset password'}
              </button>
              <div className="fp-back-row">
                <a href="/login" onClick={backToLogin} className="forgot-link">Back to sign in</a>
              </div>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <>
              <div className="fp-success-block">
                <div className="fp-success-check">{'\u2713'}</div>
                <p className="fp-success-text">Redirecting you to sign in\u2026</p>
              </div>
              <div className="fp-back-row">
                <a href="/login" onClick={backToLogin} className="forgot-link">Go to sign in now</a>
              </div>
            </>
          )}
        </div>

        <p className="login-tagline">The AI-powered platform that runs your business end to end</p>
      </div>
    </div>
  );
};

export default ForgotPassword;
