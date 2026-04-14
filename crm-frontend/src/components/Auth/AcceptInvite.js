import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../apiClient';
import { AuthContext } from '../../App';
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

const AcceptInvite = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext) || {};

  const [step, setStep] = useState(1); // 1=email+code, 2=setup, 3=done
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef(null);
  const firstNameRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => { document.body.dataset.theme = e.matches ? 'dark' : 'light'; };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (step === 1) emailRef.current?.focus();
    if (step === 2) firstNameRef.current?.focus();
  }, [step]);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })),
    [password]
  );
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordValid = passwordChecks.every((c) => c.ok) && passwordsMatch;

  const handleVerifyInvite = (e) => {
    e?.preventDefault?.();
    setError('');
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const digits = String(code || '').replace(/\D/g, '');
    if (!trimmedEmail) { setError('Enter your email address.'); return; }
    if (digits.length !== 6) { setError('Enter the 6-digit code from your invite email.'); return; }
    setCode(digits);
    setStep(2);
  };

  const handleAcceptInvite = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!passwordValid) {
      setError('Password does not meet all requirements.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/accounts/auth/accept-invite/', {
        email: email.trim().toLowerCase(),
        code,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
      });

      if (data.access && login) {
        const tenantList = data.activeTenant ? [data.activeTenant] : [];
        login(data.access, data.refresh, new Date(Date.now() + 3600 * 1000).toISOString(), tenantList, data.user);
      }
      setStep(3);
    } catch (err) {
      setError(extractError(err, 'Unable to set up your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 3) return undefined;
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [step, navigate]);

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
            {renderHeader('Accept Invitation', 'Enter your email and the 6-digit code from your invite.')}
            {error && <div className="error-flash">{error}</div>}
            <form onSubmit={handleVerifyInvite}>
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
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className="login-input fp-code-input"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Invite code"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div className="action-row">
                <button type="submit" className="btn-solid" disabled={!email || code.length !== 6}>
                  Continue
                </button>
              </div>
              <div className="help-row">
                <a href="/login" onClick={backToLogin}>Already have an account? Sign in</a>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            {renderHeader('Set Up Your Account', 'Complete your profile to get started.')}
            {error && <div className="error-flash">{error}</div>}
            <form onSubmit={handleAcceptInvite}>
              <div className="input-stack">
                <input
                  ref={firstNameRef}
                  type="text"
                  className="login-input"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  required
                />
                <input
                  type="text"
                  className="login-input"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  required
                />
                <div className="fp-password-row">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="Password"
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
                  placeholder="Confirm password"
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
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
              <div className="help-row">
                <button type="button" className="fp-link-btn" onClick={() => setStep(1)}>
                  Back
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            {renderHeader('Welcome to Abon', 'Your account is ready.')}
            <div className="fp-success-block">
              <div className="fp-success-check" aria-hidden="true">{'\u2713'}</div>
              <p className="fp-success-text">Taking you to the dashboard...</p>
            </div>
          </>
        )}

        <div className="login-footnote">
          Need help? Contact your workspace admin.
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
