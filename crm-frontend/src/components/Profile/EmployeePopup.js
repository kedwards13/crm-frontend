// src/components/Profile/EmployeePopup.js
import React, { useEffect, useState } from 'react';
import api from '../../apiClient';
import './EmployeePopup.css';

const ROLE_OPTIONS = [
  { value: 'Tech', label: 'Technician' },
  { value: 'Sales', label: 'Sales Rep' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

const COMPENSATION_TYPES = [
  { value: 'salary', label: 'Salary' },
  { value: 'hourly', label: 'Hourly' },
];

const TABS = [
  { key: 'info', label: 'Info', icon: '👤' },
  { key: 'pay', label: 'Pay', icon: '💰' },
  { key: 'commission', label: 'Commission', icon: '📊' },
  { key: 'docs', label: 'Docs', icon: '📄' },
  { key: 'skills', label: 'Skills', icon: '🎓' },
  { key: 'vacation', label: 'Time Off', icon: '🏖️' },
  { key: 'security', label: 'Security', icon: '🔐' },
];

const normalizeUserRole = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['admin', 'owner', 'superadmin'].includes(normalized)) return 'Admin';
  if (['manager', 'mgr'].includes(normalized)) return 'Manager';
  if (['sales', 'sales_rep', 'member'].includes(normalized)) return 'Sales';
  if (['office_staff', 'office'].includes(normalized)) return 'office_staff';
  if (['tech', 'technician', 'field_tech', 'instructor'].includes(normalized)) return 'Tech';
  return 'Tech';
};

const USER_UPDATE_ENDPOINTS = (userId) => [
  `/accounts/team/users/${userId}/`,
  `/accounts/users/${userId}/`,
];

const isEndpointFallbackStatus = (status) => status === 404 || status === 405;

const EmployeePopup = ({ employee, onClose, onSave }) => {
  const [updatedEmployee, setUpdatedEmployee] = useState({
    ...employee,
    role: normalizeUserRole(employee?.role),
  });
  const [activeTab, setActiveTab] = useState('info');
  const [showFileInput, setShowFileInput] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null); // { type: 'success'|'error', message }

  // Security tab state
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordConfirm, setTempPasswordConfirm] = useState('');
  const [securityAction, setSecurityAction] = useState(null); // 'reset'|'temp'
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityResult, setSecurityResult] = useState(null);

  // Vacation/time-off state
  const [timeOffEntries, setTimeOffEntries] = useState([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState({ start_date: '', end_date: '', reason: '' });

  // Load compensation data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await api.get('/analytics/cost-configuration/');
        const profiles = Array.isArray(response?.data?.compensation_profiles)
          ? response.data.compensation_profiles
          : [];
        const match = profiles.find((row) => Number(row?.user_id) === Number(employee?.id));
        if (!mounted || !match) return;
        setUpdatedEmployee((prev) => ({
          ...prev,
          salary: match?.monthly_salary ?? prev.salary ?? '',
          hourly_rate: match?.hourly_rate ?? prev.hourly_rate ?? '',
          commissionRate: match?.commission_rate ?? prev.commissionRate ?? '',
          compensation_type: match?.compensation_type || prev.compensation_type || 'salary',
          compensation_notes: match?.notes || prev.compensation_notes || '',
        }));
      } catch {
        // Keep popup usable even if compensation data is unavailable.
      }
    })();
    return () => { mounted = false; };
  }, [employee?.id]);

  // Load time-off / tech availability
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTimeOffLoading(true);
        const res = await api.get('/scheduling/tech-availability/', {
          params: { tech__user: employee?.id },
        });
        if (!mounted) return;
        const items = Array.isArray(res?.data?.results) ? res.data.results
          : Array.isArray(res?.data) ? res.data : [];
        setTimeOffEntries(items.filter(e => e.kind === 'unavailable'));
      } catch {
        // Endpoint may not exist for all tenants
      } finally {
        if (mounted) setTimeOffLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [employee?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUpdatedEmployee((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setUpdatedEmployee((prev) => ({ ...prev, avatar: URL.createObjectURL(file) }));
    }
  };

  const clearResult = () => setSaveResult(null);

  // ── Save employee changes ──
  const saveEmployeeChanges = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const formData = new FormData();
      formData.append('first_name', updatedEmployee.first_name || updatedEmployee.firstName || '');
      formData.append('last_name', updatedEmployee.last_name || updatedEmployee.lastName || '');
      formData.append('email', updatedEmployee.email || '');
      formData.append('phone_number', updatedEmployee.phone_number || '');
      formData.append('role', updatedEmployee.role || 'Tech');
      formData.append('is_active', updatedEmployee.is_active !== false ? 'true' : 'false');
      formData.append('external_sales_rep_id', updatedEmployee.external_sales_rep_id || '');
      formData.append('twilio_phone', updatedEmployee.twilio_phone || '');
      formData.append('call_forwarding', updatedEmployee.call_forwarding || '');
      if (avatarFile) formData.append('avatar', avatarFile);

      let response = null;
      let lastError = null;
      for (const endpoint of USER_UPDATE_ENDPOINTS(updatedEmployee.id)) {
        try {
          response = await api.patch(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          break;
        } catch (err) {
          lastError = err;
          if (isEndpointFallbackStatus(err?.response?.status)) continue;
          break;
        }
      }
      if (!response) throw lastError || new Error('Unable to update team member.');

      // Save compensation profile
      try {
        await api.patch(`/analytics/compensation-profiles/${updatedEmployee.id}/`, {
          compensation_type: updatedEmployee.compensation_type || 'salary',
          monthly_salary: updatedEmployee.salary || null,
          hourly_rate: updatedEmployee.hourly_rate || null,
          commission_rate: updatedEmployee.commissionRate || null,
          notes: updatedEmployee.compensation_notes || '',
          is_active: true,
        });
      } catch {
        // Non-critical — compensation save can fail independently
      }

      setSaveResult({ type: 'success', message: 'Employee details saved.' });
      if (onSave) onSave(response.data);
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'Failed to save.';
      setSaveResult({ type: 'error', message: detail });
    } finally {
      setSaving(false);
    }
  };

  // ── Security: Send password reset via dedicated admin endpoint ──
  const handleSendPasswordReset = async () => {
    setSecurityLoading(true);
    setSecurityResult(null);
    try {
      const res = await api.post(`/accounts/team/${updatedEmployee.id}/send-password-reset/`);
      setSecurityResult({
        type: 'success',
        message: res?.data?.detail || 'Password reset code sent to ' + updatedEmployee.email,
      });
    } catch (err) {
      setSecurityResult({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to send reset email.',
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Security: Set temporary password via dedicated admin endpoint ──
  const handleSetTempPassword = async () => {
    if (!tempPassword || tempPassword.length < 8) {
      setSecurityResult({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    if (tempPassword !== tempPasswordConfirm) {
      setSecurityResult({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (!/[A-Z]/.test(tempPassword)) {
      setSecurityResult({ type: 'error', message: 'Password must contain at least one uppercase letter.' });
      return;
    }
    if (!/\d/.test(tempPassword)) {
      setSecurityResult({ type: 'error', message: 'Password must contain at least one number.' });
      return;
    }

    setSecurityLoading(true);
    setSecurityResult(null);
    try {
      const res = await api.post(
        `/accounts/team/${updatedEmployee.id}/set-temporary-password/`,
        { password: tempPassword }
      );
      setSecurityResult({
        type: 'success',
        message: res?.data?.detail || 'Temporary password set. User must change on next login.',
      });
      setTempPassword('');
      setTempPasswordConfirm('');
      setSecurityAction(null);
    } catch (err) {
      setSecurityResult({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to set password.',
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Time Off: Add request ──
  const handleAddTimeOff = async () => {
    if (!newTimeOff.start_date || !newTimeOff.end_date) return;
    try {
      // Find tech profile ID for this user
      const techRes = await api.get('/scheduling/technicians/', {
        params: { user: employee?.id },
      });
      const techList = Array.isArray(techRes?.data?.results) ? techRes.data.results
        : Array.isArray(techRes?.data) ? techRes.data : [];
      const techProfile = techList[0];
      if (!techProfile) {
        alert('No technician profile found for this user.');
        return;
      }
      await api.post('/scheduling/tech-availability/', {
        tech: techProfile.id,
        start_at: newTimeOff.start_date + 'T00:00:00Z',
        end_at: newTimeOff.end_date + 'T23:59:59Z',
        kind: 'unavailable',
        reason: newTimeOff.reason || 'Time off',
      });
      setNewTimeOff({ start_date: '', end_date: '', reason: '' });
      // Reload
      const res = await api.get('/scheduling/tech-availability/', {
        params: { tech__user: employee?.id },
      });
      const items = Array.isArray(res?.data?.results) ? res.data.results
        : Array.isArray(res?.data) ? res.data : [];
      setTimeOffEntries(items.filter(e => e.kind === 'unavailable'));
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to add time off request.');
    }
  };

  const firstName = updatedEmployee.first_name || updatedEmployee.firstName || '';
  const lastName = updatedEmployee.last_name || updatedEmployee.lastName || '';
  const roleBadge = normalizeUserRole(updatedEmployee.role);
  const isActive = updatedEmployee.is_active !== false;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup employee-popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>

        {/* ── Header ── */}
        <div className="popup-header">
          <div className="header-avatar" onClick={() => setShowFileInput(!showFileInput)}>
            {updatedEmployee.avatar ? (
              <img src={updatedEmployee.avatar} alt="Avatar" className="avatar-img" />
            ) : (
              <span className="avatar-initials">
                {(firstName[0] || '').toUpperCase()}{(lastName[0] || '').toUpperCase()}
              </span>
            )}
          </div>
          {showFileInput && (
            <input type="file" accept="image/*" onChange={handleProfilePicChange}
              className="avatar-file-input" />
          )}
          <h2>{firstName} {lastName}</h2>
          <p className="header-email">{updatedEmployee.email}</p>
          <div className="header-badges">
            <span className={`badge badge-role badge-${roleBadge.toLowerCase()}`}>{roleBadge}</span>
            <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <nav className="popup-navbar">
          {TABS.map((tab) => (
            <button key={tab.key}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => { setActiveTab(tab.key); setSaveResult(null); setSecurityResult(null); }}
              title={tab.label}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Result Banner ── */}
        {saveResult && (
          <div className={`result-banner result-${saveResult.type}`} onClick={clearResult}>
            {saveResult.message}
          </div>
        )}

        {/* ── Tab Content ── */}
        <div className="popup-content">

          {/* ═══ INFO TAB ═══ */}
          {activeTab === 'info' && (
            <section className="tab-section">
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>First Name</label>
                  <input type="text" name="first_name" value={firstName} onChange={handleChange} />
                </div>
                <div className="popup-form-group">
                  <label>Last Name</label>
                  <input type="text" name="last_name" value={lastName} onChange={handleChange} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={updatedEmployee.email || ''} onChange={handleChange} />
                </div>
                <div className="popup-form-group">
                  <label>Phone</label>
                  <input type="text" name="phone_number" value={updatedEmployee.phone_number || ''} onChange={handleChange} />
                </div>
              </div>
              <div className="popup-form-group">
                <label>Address</label>
                <input type="text" name="address" value={updatedEmployee.address || ''} onChange={handleChange} />
              </div>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Role</label>
                  <select name="role" value={updatedEmployee.role || 'Tech'} onChange={handleChange}>
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="popup-form-group">
                  <label>Status</label>
                  <select
                    name="is_active"
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setUpdatedEmployee((prev) => ({
                      ...prev,
                      is_active: e.target.value === 'true',
                    }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Twilio Phone</label>
                  <input type="text" name="twilio_phone" value={updatedEmployee.twilio_phone || ''} onChange={handleChange} />
                </div>
                <div className="popup-form-group">
                  <label>Call Forwarding</label>
                  <input type="text" name="call_forwarding" value={updatedEmployee.call_forwarding || ''} onChange={handleChange} />
                </div>
              </div>
              <div className="popup-form-group">
                <label>External Sales Rep ID</label>
                <input type="text" name="external_sales_rep_id"
                  value={updatedEmployee.external_sales_rep_id || ''} onChange={handleChange} />
              </div>
            </section>
          )}

          {/* ═══ PAY TAB ═══ */}
          {activeTab === 'pay' && (
            <section className="tab-section">
              <h3>Compensation</h3>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Pay Type</label>
                  <select name="compensation_type"
                    value={updatedEmployee.compensation_type || 'salary'}
                    onChange={handleChange}>
                    {COMPENSATION_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="popup-form-group">
                  <label>
                    {(updatedEmployee.compensation_type || 'salary') === 'hourly'
                      ? 'Hourly Rate ($)'
                      : 'Monthly Salary ($)'}
                  </label>
                  <input type="number" step="0.01"
                    name={(updatedEmployee.compensation_type || 'salary') === 'hourly' ? 'hourly_rate' : 'salary'}
                    value={(updatedEmployee.compensation_type || 'salary') === 'hourly'
                      ? (updatedEmployee.hourly_rate || '')
                      : (updatedEmployee.salary || '')}
                    onChange={handleChange} />
                </div>
              </div>
              <div className="popup-form-group">
                <label>Payroll Notes</label>
                <textarea rows="3" name="compensation_notes"
                  value={updatedEmployee.compensation_notes || ''}
                  onChange={handleChange}
                  placeholder="Overtime eligibility, bonus structure, etc." />
              </div>
            </section>
          )}

          {/* ═══ COMMISSION TAB ═══ */}
          {activeTab === 'commission' && (
            <section className="tab-section">
              <h3>Commission Profile</h3>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Commission Rate (%)</label>
                  <input type="number" step="0.1" name="commissionRate"
                    value={updatedEmployee.commissionRate || ''} onChange={handleChange} />
                </div>
                <div className="popup-form-group">
                  <label>Commission Basis</label>
                  <input type="text" name="commission_basis"
                    value={updatedEmployee.commission_basis || ''}
                    onChange={handleChange}
                    placeholder="e.g. Revenue, Profit, Per Job" />
                </div>
              </div>
              <div className="empty-state">
                <span className="empty-icon">📊</span>
                <p>Commission ledger not configured yet.</p>
                <p className="empty-hint">Earnings tracking will appear here once the commission system is enabled.</p>
              </div>
            </section>
          )}

          {/* ═══ DOCS TAB ═══ */}
          {activeTab === 'docs' && (
            <section className="tab-section">
              <h3>Employee Documents</h3>
              <div className="doc-categories">
                {['W-9 / W-4', 'Onboarding', 'Certifications', 'Licenses', 'Agreements'].map((cat) => (
                  <div key={cat} className="doc-category">
                    <span className="doc-cat-label">{cat}</span>
                    <span className="doc-cat-status">No files</span>
                  </div>
                ))}
              </div>
              <div className="empty-state">
                <span className="empty-icon">📄</span>
                <p>Document management not configured yet.</p>
                <p className="empty-hint">Upload and manage employee documents once the backend is connected.</p>
              </div>
            </section>
          )}

          {/* ═══ SKILLS TAB ═══ */}
          {activeTab === 'skills' && (
            <section className="tab-section">
              <h3>Skills &amp; Training</h3>
              {/* Skills from technician profile */}
              <div className="popup-form-group">
                <label>Skills</label>
                <p className="tab-hint">
                  {Array.isArray(employee?.skills) && employee.skills.length > 0
                    ? employee.skills.join(', ')
                    : 'No skills assigned yet.'}
                </p>
              </div>
              <div className="empty-state">
                <span className="empty-icon">🎓</span>
                <p>Training assignments not configured yet.</p>
                <p className="empty-hint">Courses, certifications, and expiration tracking will appear here.</p>
              </div>
            </section>
          )}

          {/* ═══ VACATION / TIME OFF TAB ═══ */}
          {activeTab === 'vacation' && (
            <section className="tab-section">
              <h3>Time Off &amp; Availability</h3>
              <div className="form-grid-3">
                <div className="popup-form-group">
                  <label>Start Date</label>
                  <input type="date" value={newTimeOff.start_date}
                    onChange={(e) => setNewTimeOff(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="popup-form-group">
                  <label>End Date</label>
                  <input type="date" value={newTimeOff.end_date}
                    onChange={(e) => setNewTimeOff(p => ({ ...p, end_date: e.target.value }))} />
                </div>
                <div className="popup-form-group">
                  <label>Reason</label>
                  <input type="text" value={newTimeOff.reason}
                    onChange={(e) => setNewTimeOff(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Vacation, sick, etc." />
                </div>
              </div>
              <button className="action-btn action-primary" onClick={handleAddTimeOff}
                disabled={!newTimeOff.start_date || !newTimeOff.end_date}>
                Add Time Off
              </button>

              {timeOffLoading ? (
                <p className="tab-hint">Loading...</p>
              ) : timeOffEntries.length > 0 ? (
                <div className="time-off-list">
                  {timeOffEntries.map((entry, i) => (
                    <div key={entry.id || i} className="time-off-entry">
                      <span className="time-off-dates">
                        {new Date(entry.start_at).toLocaleDateString()} — {new Date(entry.end_at).toLocaleDateString()}
                      </span>
                      <span className="time-off-reason">{entry.reason || 'Time off'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="tab-hint">No time off scheduled.</p>
              )}
            </section>
          )}

          {/* ═══ SECURITY TAB ═══ */}
          {activeTab === 'security' && (
            <section className="tab-section">
              <h3>Account Security</h3>
              <p className="tab-hint">Manage login credentials for this team member.</p>

              {securityResult && (
                <div className={`result-banner result-${securityResult.type}`}
                  onClick={() => setSecurityResult(null)}>
                  {securityResult.message}
                </div>
              )}

              <div className="security-actions">
                <button className="action-btn action-primary"
                  onClick={handleSendPasswordReset}
                  disabled={securityLoading}>
                  {securityLoading ? 'Sending...' : 'Send Password Reset Email'}
                </button>

                <button className="action-btn action-warning"
                  onClick={() => setSecurityAction(securityAction === 'temp' ? null : 'temp')}
                  disabled={securityLoading}>
                  Set Temporary Password
                </button>
              </div>

              {securityAction === 'temp' && (
                <div className="temp-password-form">
                  <div className="popup-form-group">
                    <label>New Password</label>
                    <input type="password" value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password" />
                  </div>
                  <div className="popup-form-group">
                    <label>Confirm Password</label>
                    <input type="password" value={tempPasswordConfirm}
                      onChange={(e) => setTempPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password" />
                  </div>
                  <div className="temp-password-actions">
                    <button className="action-btn action-primary"
                      onClick={handleSetTempPassword}
                      disabled={securityLoading || !tempPassword}>
                      {securityLoading ? 'Setting...' : 'Set Password'}
                    </button>
                    <button className="action-btn action-neutral"
                      onClick={() => { setSecurityAction(null); setTempPassword(''); setTempPasswordConfirm(''); }}>
                      Cancel
                    </button>
                  </div>
                  <p className="tab-hint">
                    User will be required to change this password on next login.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="popup-actions">
          <button className="action-btn action-save" onClick={saveEmployeeChanges} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="action-btn action-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default EmployeePopup;
