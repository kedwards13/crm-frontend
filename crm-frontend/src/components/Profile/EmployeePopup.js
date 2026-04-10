// src/components/Settings/EmployeePopup.js
import React, { useEffect, useState } from 'react';
import api from '../../apiClient';
import './EmployeePopup.css';

const PIPELINE_STATUSES = [
  { key: 'active', label: 'Active' },
  { key: 'on_leave', label: 'On Leave' },
  { key: 'terminated', label: 'Terminated' },
];

const normalizeUserRole = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'manager') return 'Manager';
  if (normalized === 'member' || normalized === 'tech' || normalized === 'technician') return 'Tech';
  return 'Tech';
};

const USER_UPDATE_ENDPOINTS = (userId) => [
  `/accounts/team/users/${userId}/`,
  `/accounts/users/${userId}/`,
];

const isEndpointFallbackStatus = (status) => status === 404 || status === 405;

const EmployeePopup = ({ employee, onClose, onSave }) => {
  // Create a local editable copy of the employee data
  const [updatedEmployee, setUpdatedEmployee] = useState({
    ...employee,
    role: normalizeUserRole(employee?.role),
  });
  // Track which tab is active: 'info', 'pay', 'commission', or 'docs'
  const [activeTab, setActiveTab] = useState('info');
  // Control display of the status update sub-popup
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  // Toggle file input for avatar upload
  const [showFileInput, setShowFileInput] = useState(false);
  // Store the new avatar file (if any)
  const [avatarFile, setAvatarFile] = useState(null);
  // Store the new document file (if any) from the Docs tab
  const [docFile, setDocFile] = useState(null);
  // Track if document save is in progress
  const [docSaving, setDocSaving] = useState(false);

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
    return () => {
      mounted = false;
    };
  }, [employee?.id]);

  // Switch tabs
  const handleTabChange = (tab) => setActiveTab(tab);

  // Generic change handler for text/number fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedEmployee((prev) => ({ ...prev, [name]: value }));
  };

  // Handle profile picture change: update preview and store file for later upload
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const imageUrl = URL.createObjectURL(file);
      setUpdatedEmployee((prev) => ({ ...prev, avatar: imageUrl }));
    }
  };

  // Handle document file change (for Docs tab)
  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocFile(file);
    }
  };

  // Helper: Save employee changes (excluding document)
  const saveEmployeeChanges = async () => {
    try {
      const formData = new FormData();
      formData.append('first_name', updatedEmployee.first_name || updatedEmployee.firstName || '');
      formData.append('last_name', updatedEmployee.last_name || updatedEmployee.lastName || '');
      formData.append('email', updatedEmployee.email || '');
      formData.append('phone_number', updatedEmployee.phone_number || '');
      formData.append('role', normalizeUserRole(updatedEmployee.role));
      formData.append('external_sales_rep_id', updatedEmployee.external_sales_rep_id || '');
      formData.append('twilio_phone', updatedEmployee.twilio_phone || '');
      formData.append('call_forwarding', updatedEmployee.call_forwarding || '');
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      let response = null;
      let lastError = null;
      for (const endpoint of USER_UPDATE_ENDPOINTS(updatedEmployee.id)) {
        try {
          response = await api.patch(endpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          break;
        } catch (err) {
          lastError = err;
          if (isEndpointFallbackStatus(err?.response?.status)) continue;
          break;
        }
      }

      if (!response) {
        throw lastError || new Error('Unable to update team member.');
      }

      await api.patch(`/analytics/compensation-profiles/${updatedEmployee.id}/`, {
        compensation_type: updatedEmployee.compensation_type || 'salary',
        monthly_salary: updatedEmployee.salary || null,
        hourly_rate: updatedEmployee.hourly_rate || null,
        commission_rate: updatedEmployee.commissionRate || null,
        notes: updatedEmployee.compensation_notes || '',
        is_active: true,
      });
  
      console.log("✅ Saved employee:", response.data);
      if (onSave) onSave(response.data);
      alert("Employee details saved successfully.");
    } catch (error) {
      console.error("❌ Error updating employee:", error);
      alert("Failed to save employee. Please check the data.");
    }
  };

  // Helper: Save document file from the Docs tab
  const saveDocument = async () => {
    if (!docFile) {
      alert("Please select a document to upload.");
      return;
    }
    setDocSaving(true);
    alert("Document upload is not supported by the current team member API.");
    setDocSaving(false);
  };

  // Helper: Update employee status locally
  const handleUpdateStatus = (newStatus) => {
    setUpdatedEmployee((prev) => ({ ...prev, status: newStatus }));
    setShowStatusPopup(false);
    alert("Status updated successfully.");
  };

  // Toggle file input visibility for avatar upload
  const handleAvatarClick = () => {
    setShowFileInput((prev) => !prev);
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup employee-popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>

        {/* Header */}
        <div className="popup-header">
          <h2>
            {updatedEmployee.first_name || updatedEmployee.firstName} {updatedEmployee.last_name || updatedEmployee.lastName}
          </h2>
          <p>{updatedEmployee.email}</p>
          {updatedEmployee.status && <p className="status-line">Status: {updatedEmployee.status}</p>}
        </div>

        {/* Navigation Tabs */}
        <nav className="popup-navbar">
          <button className={activeTab === 'info' ? 'active' : ''} onClick={() => handleTabChange('info')}>
            Info
          </button>
          <button className={activeTab === 'pay' ? 'active' : ''} onClick={() => handleTabChange('pay')}>
            Pay
          </button>
          <button className={activeTab === 'commission' ? 'active' : ''} onClick={() => handleTabChange('commission')}>
            Commission
          </button>
          <button className={activeTab === 'docs' ? 'active' : ''} onClick={() => handleTabChange('docs')}>
            Docs
          </button>
        </nav>

        {/* Tab Content */}
        <div className="popup-content">
          {activeTab === 'info' && (
            <section className="tab-section">
              <h3>Basic Information</h3>
              <div className="popup-form-group pic-group">
                <label className="pic-label">Profile Picture</label>
                <div className="avatar-container" onClick={handleAvatarClick}>
                  {updatedEmployee.avatar ? (
                    <img src={updatedEmployee.avatar} alt="Profile" className="profile-pic-preview" />
                  ) : (
                    <div className="no-pic">No picture (click to add)</div>
                  )}
                </div>
                {showFileInput && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="avatar-file-input"
                  />
                )}
              </div>
              <div className="popup-form-group">
                <label>Phone</label>
                <input
                  type="text"
                  name="phone_number"
                  value={updatedEmployee.phone_number || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={updatedEmployee.address || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>Role</label>
                <select name="role" value={updatedEmployee.role || 'Tech'} onChange={handleChange}>
                  <option value="Tech">Member (Tech)</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="popup-form-group">
                <label>Twilio Phone</label>
                <input
                  type="text"
                  name="twilio_phone"
                  value={updatedEmployee.twilio_phone || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>Call Forwarding</label>
                <input
                  type="text"
                  name="call_forwarding"
                  value={updatedEmployee.call_forwarding || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>External Sales Rep ID</label>
                <input
                  type="text"
                  name="external_sales_rep_id"
                  value={updatedEmployee.external_sales_rep_id || ''}
                  onChange={handleChange}
                />
              </div>
            </section>
          )}

          {activeTab === 'pay' && (
            <section className="tab-section">
              <h3>Pay Details</h3>
              <div className="popup-form-group">
                <label>Compensation Type</label>
                <select
                  name="compensation_type"
                  value={updatedEmployee.compensation_type || 'salary'}
                  onChange={handleChange}
                >
                  <option value="salary">Salary</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div className="popup-form-group">
                <label>Base Salary</label>
                <input
                  type="number"
                  name="salary"
                  value={updatedEmployee.salary || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>Hourly Rate</label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={updatedEmployee.hourly_rate || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>Bonus</label>
                <input
                  type="number"
                  name="bonus"
                  value={updatedEmployee.bonus || ''}
                  onChange={handleChange}
                />
              </div>
            </section>
          )}

          {activeTab === 'commission' && (
            <section className="tab-section">
              <h3>Commission Details</h3>
              <div className="popup-form-group">
                <label>Commission Rate (%)</label>
                <input
                  type="number"
                  name="commissionRate"
                  value={updatedEmployee.commissionRate || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="popup-form-group">
                <label>Commission Earned</label>
                <input
                  type="number"
                  name="commissionEarned"
                  value={updatedEmployee.commissionEarned || ''}
                  onChange={handleChange}
                />
              </div>
              <p className="tab-hint">
                Track total sales or additional data here as needed.
              </p>
              <div className="popup-form-group">
                <label>Compensation Notes</label>
                <textarea
                  rows="3"
                  name="compensation_notes"
                  value={updatedEmployee.compensation_notes || ''}
                  onChange={handleChange}
                />
              </div>
            </section>
          )}

          {activeTab === 'docs' && (
            <section className="tab-section">
              <h3>Documents</h3>
              <p>Upload or view contracts, tax forms, and other documents here.</p>
              <div className="popup-form-group">
                <label>Upload Document</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={handleDocFileChange}
                />
              </div>
              <button 
                className="doc-save-btn" 
                onClick={saveDocument} 
                disabled={docSaving}
              >
                {docSaving ? 'Saving Document...' : 'Save Document'}
              </button>
            </section>
          )}
        </div>

        {/* Popup Actions */}
        <div className="popup-actions">
          <button className="save-btn" onClick={saveEmployeeChanges}>Save Changes</button>
          <button className="update-btn" onClick={() => setShowStatusPopup(true)}>Update Status</button>
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>

        {/* Status Popup */}
        {showStatusPopup && (
          <div className="status-popup">
            <h3>Update Status</h3>
            {PIPELINE_STATUSES.map((status) => (
              <button
                key={status.key}
                className="status-btn"
                onClick={() => handleUpdateStatus(status.key)}
              >
                {status.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePopup;
