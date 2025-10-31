import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../SettingsCommon.css';

const API = process.env.REACT_APP_API_URL;

export default function CompanyProfile() {
  const [form, setForm] = useState({
    name: '',
    domain: '',
    timezone: 'America/New_York',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    logo: '', // logo URL
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/accounts/tenant/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!mounted) return;
        setForm((f) => ({ ...f, ...data }));
      } catch (e) {
        console.warn("Could not load company profile:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSave = async () => {
    setMsg('');
    try {
      await axios.put(`${API}/api/accounts/tenant/`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('✅ Saved!');
      const raw = localStorage.getItem('activeTenant');
      if (raw) {
        const t = JSON.parse(raw);
        t.name = form.name;
        t.domain = form.domain;
        localStorage.setItem('activeTenant', JSON.stringify(t));
        window.dispatchEvent(new Event('activeTenant:changed'));
      }
    } catch (e) {
      setMsg('❌ Save failed. Check fields or try again.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login'; // simple redirect
  };

  if (loading) return <div className="settings-page"><p>Loading…</p></div>;

  return (
    <div className="settings-page">
      <h2>Company Profile</h2>

      {msg && <p className="settings-msg">{msg}</p>}

      <div className="settings-card">
        <div className="settings-form">
          <label>Company Name
            <input name="name" value={form.name} onChange={onChange} />
          </label>

          <label>Domain
            <input name="domain" value={form.domain} onChange={onChange} placeholder="example.com" />
          </label>

          <label>Timezone
            <select name="timezone" value={form.timezone} onChange={onChange}>
              <option value="America/Los_Angeles">Pacific (LA)</option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/New_York">Eastern (NY)</option>
              <option value="UTC">UTC</option>
            </select>
          </label>

          <label>Logo URL
            <input name="logo" value={form.logo} onChange={onChange} placeholder="https://…" />
          </label>

          {form.logo && (
            <div className="logo-preview">
              <img src={form.logo} alt="Company Logo" style={{ maxHeight: '60px', marginTop: '10px' }} />
            </div>
          )}
        </div>
      </div>

      <h3>Address</h3>
      <div className="settings-card">
        <div className="settings-form two-col">
          <label>Address 1
            <input name="address1" value={form.address1 || ''} onChange={onChange} />
          </label>
          <label>Address 2
            <input name="address2" value={form.address2 || ''} onChange={onChange} />
          </label>
          <label>City
            <input name="city" value={form.city || ''} onChange={onChange} />
          </label>
          <label>State
            <input name="state" value={form.state || ''} onChange={onChange} />
          </label>
          <label>ZIP
            <input name="zip" value={form.zip || ''} onChange={onChange} />
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-primary" onClick={onSave}>💾 Save</button>
        <button className="settings-secondary" onClick={handleLogout}>🚪 Logout</button>
      </div>
    </div>
  );
}