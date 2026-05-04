// src/components/Profile/EmployeePopup.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  User, Wallet, BarChart3, FileText, GraduationCap, CalendarOff, Lock,
  X, ChevronDown, Upload, Trash2, Download, Plus, Send, KeyRound,
} from 'lucide-react';
import api from '../../apiClient';
import './EmployeePopup.css';

// ── Constants ──

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
  { key: 'info', label: 'Info', Icon: User },
  { key: 'pay', label: 'Pay', Icon: Wallet },
  { key: 'commission', label: 'Commission', Icon: BarChart3 },
  { key: 'docs', label: 'Docs', Icon: FileText },
  { key: 'skills', label: 'Skills', Icon: GraduationCap },
  { key: 'vacation', label: 'Time Off', Icon: CalendarOff },
  { key: 'security', label: 'Security', Icon: Lock },
];

const TIME_OFF_CATEGORIES = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'pto', label: 'PTO' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
];

const DOC_CATEGORIES = [
  'Tax Forms', 'Onboarding', 'Certifications', 'Licenses',
  'Agreements', 'Training Docs', 'Safety Docs', 'Industry Compliance',
];

const SKILL_PRESETS = {
  pest_control: [
    'General Pest', 'Termite', 'Mosquito', 'Rodent', 'Bed Bug', 'Wildlife',
    'Chemical Safety', 'SDS Handling', 'State License', 'WDO Inspection',
  ],
  landscaping: [
    'Mowing', 'Fertilization', 'Irrigation', 'Hardscape', 'Tree/Shrub Care',
    'Equipment Safety', 'Design', 'Sod Installation',
  ],
  lawn_care: [
    'Mowing', 'Fertilization', 'Weed Control', 'Aeration', 'Overseeding',
    'Irrigation', 'Equipment Safety',
  ],
  home_services: [
    'Inspection', 'Estimate Writing', 'Install', 'Repair', 'Warranty Handling',
    'Customer Education', 'Safety Compliance',
  ],
  general: [
    'Customer Service', 'Safety', 'Equipment Operation', 'Documentation',
  ],
};

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

// ── Component ──

const EmployeePopup = ({ employee, onClose, onSave }) => {
  const [updatedEmployee, setUpdatedEmployee] = useState({
    ...employee,
    role: normalizeUserRole(employee?.role),
  });
  const [activeTab, setActiveTab] = useState('info');
  const [showFileInput, setShowFileInput] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Security
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordConfirm, setTempPasswordConfirm] = useState('');
  const [securityAction, setSecurityAction] = useState(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityResult, setSecurityResult] = useState(null);

  // Time Off
  const [timeOffEntries, setTimeOffEntries] = useState([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState({
    category: 'vacation', start_date: '', end_date: '', reason: '',
  });

  // Skills
  const [serviceTypes, setServiceTypes] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [tenantIndustry, setTenantIndustry] = useState('general');

  // ── Load compensation ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await api.get('/analytics/cost-configuration/');
        const profiles = Array.isArray(response?.data?.compensation_profiles)
          ? response.data.compensation_profiles : [];
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
      } catch { /* non-critical */ }
    })();
    return () => { mounted = false; };
  }, [employee?.id]);

  // ── Load time-off entries ──
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
      } catch { /* endpoint may not exist */ }
      finally { if (mounted) setTimeOffLoading(false); }
    })();
    return () => { mounted = false; };
  }, [employee?.id]);

  // ── Load service types for skills ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setSkillsLoading(true);
        const res = await api.get('/scheduling/service-types/');
        if (!mounted) return;
        const items = Array.isArray(res?.data?.results) ? res.data.results
          : Array.isArray(res?.data) ? res.data : [];
        setServiceTypes(items);
      } catch { /* non-critical */ }
      finally { if (mounted) setSkillsLoading(false); }
    })();
    // Try to get tenant industry
    (async () => {
      try {
        const me = await api.get('/accounts/auth/me/');
        if (mounted && me?.data?.industry) {
          setTenantIndustry(String(me.data.industry).toLowerCase().replace(/\s+/g, '_'));
        }
      } catch { /* non-critical */ }
    })();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUpdatedEmployee((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setUpdatedEmployee((prev) => ({ ...prev, avatar: URL.createObjectURL(file) }));
    }
  };

  // ── Save employee ──
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

      try {
        await api.patch(`/analytics/compensation-profiles/${updatedEmployee.id}/`, {
          compensation_type: updatedEmployee.compensation_type || 'salary',
          monthly_salary: updatedEmployee.salary || null,
          hourly_rate: updatedEmployee.hourly_rate || null,
          commission_rate: updatedEmployee.commissionRate || null,
          notes: updatedEmployee.compensation_notes || '',
          is_active: true,
        });
      } catch { /* non-critical */ }

      setSaveResult({ type: 'success', message: 'Employee details saved.' });
      if (onSave) onSave(response.data);
    } catch (error) {
      setSaveResult({ type: 'error', message: error?.response?.data?.detail || error?.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Security: password reset ──
  const handleSendPasswordReset = async () => {
    setSecurityLoading(true);
    setSecurityResult(null);
    try {
      const res = await api.post(`/accounts/team/${updatedEmployee.id}/send-password-reset/`);
      setSecurityResult({ type: 'success', message: res?.data?.detail || 'Reset code sent.' });
    } catch (err) {
      setSecurityResult({ type: 'error', message: err?.response?.data?.detail || 'Failed to send.' });
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Security: temp password ──
  const handleSetTempPassword = async () => {
    if (!tempPassword || tempPassword.length < 8) {
      setSecurityResult({ type: 'error', message: 'Min 8 characters.' }); return;
    }
    if (tempPassword !== tempPasswordConfirm) {
      setSecurityResult({ type: 'error', message: 'Passwords do not match.' }); return;
    }
    if (!/[A-Z]/.test(tempPassword)) {
      setSecurityResult({ type: 'error', message: 'Need at least one uppercase letter.' }); return;
    }
    if (!/\d/.test(tempPassword)) {
      setSecurityResult({ type: 'error', message: 'Need at least one number.' }); return;
    }
    setSecurityLoading(true);
    setSecurityResult(null);
    try {
      const res = await api.post(`/accounts/team/${updatedEmployee.id}/set-temporary-password/`, { password: tempPassword });
      setSecurityResult({ type: 'success', message: res?.data?.detail || 'Password set.' });
      setTempPassword(''); setTempPasswordConfirm(''); setSecurityAction(null);
    } catch (err) {
      setSecurityResult({ type: 'error', message: err?.response?.data?.detail || 'Failed.' });
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Time Off: add ──
  const handleAddTimeOff = async () => {
    if (!newTimeOff.start_date || !newTimeOff.end_date) return;
    try {
      const techRes = await api.get('/scheduling/technicians/', { params: { user: employee?.id } });
      const techList = Array.isArray(techRes?.data?.results) ? techRes.data.results
        : Array.isArray(techRes?.data) ? techRes.data : [];
      const techProfile = techList[0];
      if (!techProfile) { alert('No technician profile found.'); return; }
      await api.post('/scheduling/tech-availability/', {
        tech: techProfile.id,
        start_at: newTimeOff.start_date + 'T00:00:00Z',
        end_at: newTimeOff.end_date + 'T23:59:59Z',
        kind: 'unavailable',
        reason: `[${newTimeOff.category}] ${newTimeOff.reason || 'Time off'}`,
      });
      setNewTimeOff({ category: 'vacation', start_date: '', end_date: '', reason: '' });
      // Reload
      const res = await api.get('/scheduling/tech-availability/', { params: { tech__user: employee?.id } });
      const items = Array.isArray(res?.data?.results) ? res.data.results
        : Array.isArray(res?.data) ? res.data : [];
      setTimeOffEntries(items.filter(e => e.kind === 'unavailable'));
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to add time off.');
    }
  };

  // ── Delete time off ──
  const handleDeleteTimeOff = async (entryId) => {
    if (!window.confirm('Remove this time off entry?')) return;
    try {
      await api.delete(`/scheduling/tech-availability/${entryId}/`);
      setTimeOffEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete.');
    }
  };

  // ── Skills: computed ──
  const industryKey = tenantIndustry.replace(/[\s-]/g, '_').toLowerCase();
  const presetSkills = SKILL_PRESETS[industryKey] || SKILL_PRESETS.general;
  const currentSkills = useMemo(() => {
    const raw = employee?.skills || updatedEmployee?.skills;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }, [employee?.skills, updatedEmployee?.skills]);

  const firstName = updatedEmployee.first_name || updatedEmployee.firstName || '';
  const lastName = updatedEmployee.last_name || updatedEmployee.lastName || '';
  const roleBadge = normalizeUserRole(updatedEmployee.role);
  const isActive = updatedEmployee.is_active !== false;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup employee-popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={18} /></button>

        {/* Header */}
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
            <input type="file" accept="image/*" onChange={handleProfilePicChange} className="avatar-file-input" />
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

        {/* Tabs */}
        <nav className="popup-navbar">
          {TABS.map((tab) => (
            <button key={tab.key}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => { setActiveTab(tab.key); setSaveResult(null); setSecurityResult(null); }}
              title={tab.label}
            >
              <tab.Icon size={16} className="tab-icon-svg" />
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Result */}
        {saveResult && (
          <div className={`result-banner result-${saveResult.type}`} onClick={() => setSaveResult(null)}>
            {saveResult.message}
          </div>
        )}

        {/* Content */}
        <div className="popup-content">

          {/* ═══ INFO ═══ */}
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
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="popup-form-group">
                  <label>Status</label>
                  <select name="is_active" value={isActive ? 'true' : 'false'}
                    onChange={(e) => setUpdatedEmployee((p) => ({ ...p, is_active: e.target.value === 'true' }))}>
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
                <input type="text" name="external_sales_rep_id" value={updatedEmployee.external_sales_rep_id || ''} onChange={handleChange} />
              </div>
            </section>
          )}

          {/* ═══ PAY ═══ */}
          {activeTab === 'pay' && (
            <section className="tab-section">
              <h3>Compensation</h3>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Pay Type</label>
                  <select name="compensation_type" value={updatedEmployee.compensation_type || 'salary'} onChange={handleChange}>
                    {COMPENSATION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="popup-form-group">
                  <label>{(updatedEmployee.compensation_type || 'salary') === 'hourly' ? 'Hourly Rate ($)' : 'Monthly Salary ($)'}</label>
                  <input type="number" step="0.01"
                    name={(updatedEmployee.compensation_type || 'salary') === 'hourly' ? 'hourly_rate' : 'salary'}
                    value={(updatedEmployee.compensation_type || 'salary') === 'hourly' ? (updatedEmployee.hourly_rate || '') : (updatedEmployee.salary || '')}
                    onChange={handleChange} />
                </div>
              </div>
              <div className="popup-form-group">
                <label>Payroll Notes</label>
                <textarea rows="3" name="compensation_notes" value={updatedEmployee.compensation_notes || ''} onChange={handleChange}
                  placeholder="Overtime eligibility, bonus structure, etc." />
              </div>
            </section>
          )}

          {/* ═══ COMMISSION ═══ */}
          {activeTab === 'commission' && (
            <section className="tab-section">
              <h3>Commission Profile</h3>
              <div className="form-grid-2">
                <div className="popup-form-group">
                  <label>Commission Rate (%)</label>
                  <input type="number" step="0.1" name="commissionRate" value={updatedEmployee.commissionRate || ''} onChange={handleChange} />
                </div>
                <div className="popup-form-group">
                  <label>Commission Basis</label>
                  <input type="text" name="commission_basis" value={updatedEmployee.commission_basis || ''} onChange={handleChange}
                    placeholder="e.g. Revenue, Profit, Per Job" />
                </div>
              </div>
              {/* TODO: Wire to GET /api/analytics/commissions/?user={id} when CommissionLedger model exists */}
              <div className="empty-state">
                <BarChart3 size={32} className="empty-icon-svg" />
                <p>Commission ledger not configured yet.</p>
                <p className="empty-hint">Earnings tracking will appear here once enabled.</p>
              </div>
            </section>
          )}

          {/* ═══ DOCS ═══ */}
          {activeTab === 'docs' && (
            <section className="tab-section">
              <h3>Employee Documents</h3>
              <div className="doc-categories">
                {DOC_CATEGORIES.map((cat) => (
                  <div key={cat} className="doc-category">
                    <div className="doc-cat-info">
                      <FileText size={14} className="doc-cat-icon" />
                      <span className="doc-cat-label">{cat}</span>
                    </div>
                    <span className="doc-cat-status">No files</span>
                  </div>
                ))}
              </div>
              {/* TODO: Wire to employee document upload/list endpoints when backend supports:
                  POST /api/accounts/team/{id}/documents/
                  GET  /api/accounts/team/{id}/documents/
                  DELETE /api/accounts/team/{id}/documents/{docId}/ */}
              <div className="empty-state">
                <FileText size={32} className="empty-icon-svg" />
                <p>Employee document backend not configured yet.</p>
                <p className="empty-hint">Upload and manage tax forms, certifications, and agreements here.</p>
              </div>
            </section>
          )}

          {/* ═══ SKILLS ═══ */}
          {activeTab === 'skills' && (
            <section className="tab-section">
              <h3>Skills &amp; Training</h3>

              {currentSkills.length > 0 ? (
                <div className="skills-list">
                  <label>Current Skills</label>
                  <div className="skill-chips">
                    {currentSkills.map((skill, i) => (
                      <span key={i} className="skill-chip skill-chip-active">{skill}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="tab-hint">No skills assigned yet.</p>
              )}

              <div className="skills-list">
                <label>Industry Presets ({industryKey.replace(/_/g, ' ')})</label>
                <div className="skill-chips">
                  {presetSkills.map((skill) => (
                    <span key={skill} className={`skill-chip ${currentSkills.includes(skill) ? 'skill-chip-active' : 'skill-chip-available'}`}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {serviceTypes.length > 0 && (
                <div className="skills-list">
                  <label>From Service Catalog</label>
                  <div className="skill-chips">
                    {serviceTypes.slice(0, 12).map((st) => (
                      <span key={st.id} className="skill-chip skill-chip-catalog">{st.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* TODO: Wire to PATCH /api/accounts/team/{id}/skills/ or
                  PATCH /api/scheduling/technicians/{techId}/ to persist skill changes.
                  Also wire training assignments when TrainingModule/TrainingAssignment models exist:
                  GET /api/training/assignments/?user={id}
                  POST /api/training/assignments/ */}
              <div className="empty-state" style={{ marginTop: 12 }}>
                <GraduationCap size={32} className="empty-icon-svg" />
                <p>Skill editing and training assignments require backend configuration.</p>
                <p className="empty-hint">Skills shown above are read-only until persistence endpoints are available.</p>
              </div>
            </section>
          )}

          {/* ═══ TIME OFF ═══ */}
          {activeTab === 'vacation' && (
            <section className="tab-section">
              <h3>Time Off &amp; Availability</h3>

              {/* TODO: PTO balance requires dedicated endpoints:
                  GET /api/accounts/team/{id}/pto-balance/
                  GET /api/accounts/team/{id}/time-off/
                  POST /api/accounts/team/{id}/time-off/
                  PATCH /api/accounts/team/time-off/{requestId}/approve/ */}

              <div className="form-grid-4">
                <div className="popup-form-group">
                  <label>Category</label>
                  <select value={newTimeOff.category}
                    onChange={(e) => setNewTimeOff(p => ({ ...p, category: e.target.value }))}>
                    {TIME_OFF_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
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
                    placeholder="Optional" />
                </div>
              </div>
              <button className="action-btn action-primary" onClick={handleAddTimeOff}
                disabled={!newTimeOff.start_date || !newTimeOff.end_date}>
                <Plus size={14} /> Add Time Off
              </button>

              {timeOffLoading ? (
                <p className="tab-hint">Loading...</p>
              ) : timeOffEntries.length > 0 ? (
                <div className="time-off-list">
                  {timeOffEntries.map((entry) => {
                    const reason = entry.reason || 'Time off';
                    const catMatch = reason.match(/^\[(\w+)\]\s*/);
                    const category = catMatch ? catMatch[1] : '';
                    const displayReason = catMatch ? reason.replace(catMatch[0], '') : reason;
                    return (
                      <div key={entry.id} className="time-off-entry">
                        <div className="time-off-info">
                          <span className="time-off-dates">
                            {new Date(entry.start_at).toLocaleDateString()} &mdash; {new Date(entry.end_at).toLocaleDateString()}
                          </span>
                          <span className="time-off-reason">
                            {category && <span className="time-off-cat">{category}</span>}
                            {displayReason}
                          </span>
                        </div>
                        <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteTimeOff(entry.id)} title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="tab-hint">No time off scheduled.</p>
              )}
            </section>
          )}

          {/* ═══ SECURITY ═══ */}
          {activeTab === 'security' && (
            <section className="tab-section">
              <h3>Account Security</h3>
              <p className="tab-hint">Manage login credentials. Only admin/manager/owner can use these actions.</p>

              {securityResult && (
                <div className={`result-banner result-${securityResult.type}`} onClick={() => setSecurityResult(null)}>
                  {securityResult.message}
                </div>
              )}

              <div className="security-actions">
                <button className="action-btn action-primary" onClick={handleSendPasswordReset} disabled={securityLoading}>
                  <Send size={14} /> {securityLoading ? 'Sending...' : 'Send Password Reset Email'}
                </button>
                <button className="action-btn action-warning"
                  onClick={() => setSecurityAction(securityAction === 'temp' ? null : 'temp')} disabled={securityLoading}>
                  <KeyRound size={14} /> Set Temporary Password
                </button>
              </div>

              {securityAction === 'temp' && (
                <div className="temp-password-form">
                  <div className="popup-form-group">
                    <label>New Password</label>
                    <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number" autoComplete="new-password" />
                  </div>
                  <div className="popup-form-group">
                    <label>Confirm Password</label>
                    <input type="password" value={tempPasswordConfirm} onChange={(e) => setTempPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password" autoComplete="new-password" />
                  </div>
                  <div className="temp-password-actions">
                    <button className="action-btn action-primary" onClick={handleSetTempPassword} disabled={securityLoading || !tempPassword}>
                      {securityLoading ? 'Setting...' : 'Set Password'}
                    </button>
                    <button className="action-btn action-neutral"
                      onClick={() => { setSecurityAction(null); setTempPassword(''); setTempPasswordConfirm(''); }}>
                      Cancel
                    </button>
                  </div>
                  <p className="tab-hint">User will be required to change this on next login.</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
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
