import React, { useEffect, useState } from 'react';
import api from '../../../apiClient';
import TimeRangePicker from '../../ui/TimeRangePicker.tsx';
import '../SettingsCommon.css';

const DEFAULT_WINDOW = { start: '08:00', end: '19:00' };

const normalize24Hour = (value = '') => {
  const raw = String(value || '').trim();
  const directMatch = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (directMatch) {
    const hour = String(directMatch[1]).padStart(2, '0');
    return `${hour}:${directMatch[2]}`;
  }

  const meridiemMatch = raw.match(/^([1-9]|1[0-2])(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (!meridiemMatch) return '';

  const hourRaw = Number(meridiemMatch[1]);
  const minute = meridiemMatch[2] || '00';
  const meridiem = meridiemMatch[3].toUpperCase();
  let hour = hourRaw;

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

const normalizeTimeRange = (value, fallback = DEFAULT_WINDOW) => {
  if (value && typeof value === 'object') {
    const start = normalize24Hour(value?.start || '');
    const end = normalize24Hour(value?.end || '');
    if (start && end) return { start, end };
  }

  if (typeof value === 'string') {
    const parts = value.split(/\s*[–-]\s*/);
    if (parts.length === 2) {
      const start = normalize24Hour(parts[0]);
      const end = normalize24Hour(parts[1]);
      if (start && end) return { start, end };
    }
  }

  return fallback;
};

export default function CommsSettings() {
  const [prefsSnapshot, setPrefsSnapshot] = useState({});
  const [autoResponseWindow, setAutoResponseWindow] = useState(DEFAULT_WINDOW);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get('/accounts/preferences/');
        const serverPrefs = data?.preferences || {};
        const commsPrefs = serverPrefs?.comms || {};
        const serverWindow =
          commsPrefs?.auto_response_window ||
          commsPrefs?.autoResponseWindow ||
          serverPrefs?.auto_response_window ||
          serverPrefs?.autoResponseWindow;

        if (!mounted) return;
        setPrefsSnapshot(serverPrefs);
        setAutoResponseWindow(normalizeTimeRange(serverWindow, DEFAULT_WINDOW));
      } catch {
        if (!mounted) return;
        setPrefsSnapshot({});
        setAutoResponseWindow(DEFAULT_WINDOW);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setMsg('');
    setSaving(true);

    const nextPreferences = {
      ...prefsSnapshot,
      comms: {
        ...(prefsSnapshot?.comms || {}),
        auto_response_window: autoResponseWindow,
      },
    };

    try {
      await api.patch('/accounts/preferences/', { preferences: nextPreferences });
      setPrefsSnapshot(nextPreferences);
      setMsg('Saved ✓');
    } catch {
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h2>Phone, SMS & Email</h2>
      <p className="muted">Configure outbound numbers, brand voice, and delivery settings.</p>
      {msg && <p className="settings-msg">{msg}</p>}

      <div className="settings-card two-col">
        <div>
          <h3>Voice & SMS</h3>
          <label>Primary Caller ID
            <input defaultValue="+1 (813) 555-1122" />
          </label>
          <label>Fallback Number
            <input defaultValue="+1 (813) 555-4401" />
          </label>
          <TimeRangePicker
            label="Auto-response Window"
            value={autoResponseWindow}
            onChange={setAutoResponseWindow}
          />
        </div>
        <div>
          <h3>Email Sending</h3>
          <label>From Address
            <input defaultValue="support@gulftech.com" />
          </label>
          <label>Reply-To
            <input defaultValue="hello@gulftech.com" />
          </label>
          <label>Tracking
            <select defaultValue="enabled">
              <option value="enabled">Open + Click Tracking</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h3>Message Templates</h3>
        <div className="table-like">
          <div className="row header">
            <div>Template</div>
            <div>Channel</div>
            <div>Owner</div>
            <div>Status</div>
            <div></div>
            <div></div>
          </div>
          {[
            { name: 'New Lead Follow-up', channel: 'SMS', owner: 'Sales Ops', status: 'Active' },
            { name: 'Appointment Reminder', channel: 'SMS', owner: 'Dispatch', status: 'Active' },
            { name: 'Post-Service Review', channel: 'Email', owner: 'Marketing', status: 'Draft' },
          ].map((row) => (
            <div key={row.name} className="row">
              <input defaultValue={row.name} />
              <input defaultValue={row.channel} />
              <input defaultValue={row.owner} />
              <select defaultValue={row.status}>
                <option>Active</option>
                <option>Draft</option>
              </select>
              <button className="mini">Edit</button>
              <button className="mini danger">Archive</button>
            </div>
          ))}
        </div>
        <button className="mini">+ New Template</button>
      </div>

      <div className="settings-actions">
        <button className="settings-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Comms Settings'}
        </button>
        <button className="settings-secondary">Send Test Message</button>
      </div>
    </div>
  );
}
