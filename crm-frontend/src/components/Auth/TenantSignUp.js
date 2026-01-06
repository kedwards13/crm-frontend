// src/components/Auth/TenantSignUp.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css'; // Uses shared auth styles

const TenantSignUp = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    companyDomain: '',
    companySize: '', // Initially empty to show placeholder
    industry: '', // New industry field
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    subscriptionPlan: '', // Initially empty to show placeholder
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Handle generic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Dedicated password change handler that updates strength
  const handlePasswordChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, password: value }));
    // Simple strength calculation based on length (customize as needed)
    if (value.length < 8) {
      setPasswordStrength(33);
    } else if (value.length < 12) {
      setPasswordStrength(66);
    } else {
      setPasswordStrength(100);
    }
  };

  // Basic validation with additional required dropdowns
  const validateForm = () => {
    const requiredFields = [
      'companyName',
      'companyDomain',
      'companySize',
      'industry',
      'firstName',
      'lastName',
      'email',
      'password',
      'subscriptionPlan',
    ];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return `${field.replace(/([A-Z])/g, ' $1')} is required.`;
      }
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:808'}/api/accounts/tenant-signup/`,
        formData
      );
      setSuccess(response.data.message);
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      localStorage.setItem(
        'token_expiry',
        (new Date().getTime() + 3600 * 1000).toString()
      );
      localStorage.setItem(
        'activeTenant',
        JSON.stringify(response.data.activeTenant)
      );
      const isSetupComplete = response.data.activeTenant?.setupComplete ?? false;
      localStorage.setItem('tenantSetupComplete', isSetupComplete.toString());
      setTimeout(() => {
        navigate(isSetupComplete ? '/dashboard' : '/settings/team');
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Something went wrong!';
      setError(errorMsg);
      console.error('Signup error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container signup-container">
      <div className="auth-header">
        <h2>Request access</h2>
        <p>Create your workspace profile to get started</p>
      </div>
      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        {/* Row 1: Company Name & Domain */}
        <div className="form-group half">
          <label>Company Name</label>
          <input
            type="text"
            name="companyName"
            placeholder="Your Company Name"
            value={formData.companyName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group half">
          <label>Company Domain</label>
          <input
            type="text"
            name="companyDomain"
            placeholder="yourcompany.com"
            value={formData.companyDomain}
            onChange={handleChange}
            required
          />
        </div>

        {/* Row 2: Company Size & Subscription Plan */}
        <div className="form-group half">
          <label>Company Size</label>
          <select
            name="companySize"
            value={formData.companySize}
            onChange={handleChange}
            required
          >
            <option value="" disabled hidden>
              Select Company Size
            </option>
            <option value="small">Small (1-50)</option>
            <option value="medium">Medium (51-200)</option>
            <option value="large">Large (200+)</option>
          </select>
        </div>
        <div className="form-group half">
          <label>Subscription Plan</label>
          <select
            name="subscriptionPlan"
            value={formData.subscriptionPlan}
            onChange={handleChange}
            required
          >
            <option value="" disabled hidden>
              Select Subscription Plan
            </option>
            <option value="base">Base</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Row 3: Industry */}
        <div className="form-group">
          <label>Industry</label>
          <select
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            required
          >
            <option value="" disabled hidden>
              Select Industry
            </option>
            <option value="general">General</option>
            <option value="pest_control">Pest Control</option>
            <option value="real_estate">Real Estate</option>
            <option value="legal">Legal</option>
            <option value="medspa">Med Spa</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>

        {/* Row 4: First & Last Name */}
        <div className="form-group half">
          <label>First Name</label>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group half">
          <label>Last Name</label>
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>

        {/* Row 5: Email & Phone Number */}
        <div className="form-group half">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group half">
          <label>Phone Number (Optional)</label>
          <input
            type="text"
            name="phoneNumber"
            placeholder="(555) 123-4567"
            value={formData.phoneNumber}
            onChange={handleChange}
          />
        </div>

        {/* Row 6: Password */}
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Create a Password"
            value={formData.password}
            onChange={handlePasswordChange}
            required
          />
          <div className="password-strength">
          <div
            className="password-strength-inner"
            style={{
              width: `${passwordStrength}%`,
              background: "var(--accent-0)",
            }}
          />
          </div>
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Submitting...' : 'Sign Up'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in here</Link>.
      </p>
    </div>
  );
};

export default TenantSignUp;
