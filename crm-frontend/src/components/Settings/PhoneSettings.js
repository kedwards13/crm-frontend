import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PhoneSettings.css';

const PhoneSettings = () => {
  const [settings, setSettings] = useState({
    extension: '',
    defaultPhone: '',
    voicemail: '',
    // other settings...
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch current phone settings from the backend
    axios.get('/api/comm/phone-settings/')
      .then((res) => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load settings.');
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Save the updated settings to the backend
    axios.post('/api/comm/phone-settings/', settings)
      .then((res) => {
        alert('Settings saved!');
      })
      .catch((err) => {
        console.error(err);
        alert('Error saving settings.');
      });
  };

  if (loading) return <p>Loading settings...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="phone-settings">
      <h2>Phone Settings</h2>
      <label>
        Extension:
        <input type="text" name="extension" value={settings.extension} onChange={handleChange} />
      </label>
      <label>
        Default Phone Number:
        <input type="text" name="defaultPhone" value={settings.defaultPhone} onChange={handleChange} />
      </label>
      <label>
        Voicemail Greeting:
        <textarea name="voicemail" value={settings.voicemail} onChange={handleChange} />
      </label>
      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
};

export default PhoneSettings;