import React, { useEffect, useMemo, useState } from 'react';
import './Auth.css';

const TenantSelector = ({ tenants = [], onSelect, onLogout, loading = false, error = '' }) => {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [localError, setLocalError] = useState('');

  const showError = useMemo(() => {
    if (error) return error;
    if (localError) return localError;
    if (!tenants.length) {
      return 'No accounts are assigned to you. Please contact an admin.';
    }
    return '';
  }, [error, localError, tenants]);

  useEffect(() => {
    setSelectedTenantId('');
  }, [tenants]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (!selectedTenantId) {
      setLocalError('Select an account to continue.');
      return;
    }
    onSelect?.(selectedTenantId);
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
            <span className="brand-chip">Account</span>
          </div>
          <p className="hero-eyebrow">Account selection</p>
        </div>

        <h1 className="hero-title">Choose an account</h1>
        <p className="hero-copy">
          Select the account you want to manage.
        </p>

        <div className="hero-actions">
          <button type="button" className="ghost-link" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-container">
          <div className="form-header">
            <div className="form-badge">AC</div>
            <div>
              <p className="form-eyebrow">Account required</p>
              <h2 className="form-title">Choose your account</h2>
              <p className="form-subtitle">Pick an account to continue.</p>
            </div>
          </div>

          {showError && <p className="error-message">{showError}</p>}

          <form onSubmit={handleSubmit}>
            <div className="tenant-options">
              {tenants.map((tenant) => {
                const tenantId = String(tenant?.id || tenant?.tenant_id || '');
                return (
                  <label
                    key={tenantId || tenant.name}
                    className={`tenant-option ${selectedTenantId === tenantId ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tenant"
                      value={tenantId}
                      checked={selectedTenantId === tenantId}
                      onChange={() => setSelectedTenantId(tenantId)}
                    />
                    <div className="tenant-option-body">
                      <div className="tenant-option-title">{tenant.name || 'Account'}</div>
                      <div className="tenant-option-meta">
                        <span>{tenant.domain || 'No domain'}</span>
                      </div>
                    </div>
                  </label>
                );
              })}

              {!tenants.length && (
                <div className="tenant-empty">
                  <p>No accounts available.</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading || !selectedTenantId || !tenants.length}
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>

            <div className="auth-links">
              <button type="button" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantSelector;
