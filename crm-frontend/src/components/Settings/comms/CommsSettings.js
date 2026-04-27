import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../../apiClient';
import { Button } from '../../ui/button';
import TimeRangePicker from '../../ui/TimeRangePicker.tsx';
import '../../../pages/settings/SettingsLayout.css';

const text = (v) => String(v || '').trim();
const bool = (v) => v === true || v === 'true' || v === '1';

export default function CommsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({});
  const [tenant, setTenant] = useState({});

  // Editable state
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [autoResponderEnabled, setAutoResponderEnabled] = useState(false);
  const [firstTouchEnabled, setFirstTouchEnabled] = useState(false);
  const [autoResponseWindow, setAutoResponseWindow] = useState({ start: '08:00', end: '19:00' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, meRes] = await Promise.all([
        api.get('/accounts/preferences/').catch(() => ({ data: {} })),
        api.get('/accounts/auth/me/').catch(() => ({ data: {} })),
      ]);
      const p = prefsRes.data?.preferences || prefsRes.data || {};
      const t = meRes.data?.tenant || meRes.data?.activeTenant || {};
      const comms = p.comms || p.communications || {};
      const ai = p.ai_settings || {};

      setPrefs(p);
      setTenant(t);

      // Hydrate editable fields from preferences
      setQuietStart(text(comms.quiet_start || ai.auto_response_end || '21:00'));
      setQuietEnd(text(comms.quiet_end || ai.auto_response_start || '08:00'));
      setAutoResponderEnabled(bool(comms.auto_responder_enabled || ai.texting_enabled));
      setFirstTouchEnabled(bool(comms.auto_first_touch_enabled));

      const serverWindow =
        comms.auto_response_window || comms.autoResponseWindow ||
        p.auto_response_window || p.autoResponseWindow;
      if (serverWindow && typeof serverWindow === 'object') {
        setAutoResponseWindow({
          start: text(serverWindow.start) || '08:00',
          end: text(serverWindow.end) || '19:00',
        });
      }
    } catch {
      toast.error('Unable to load communications settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextComms = {
        ...(prefs.comms || {}),
        quiet_start: quietStart,
        quiet_end: quietEnd,
        auto_responder_enabled: autoResponderEnabled,
        auto_first_touch_enabled: firstTouchEnabled,
        auto_response_window: autoResponseWindow,
      };

      await api.patch('/accounts/preferences/', {
        preferences: {
          ...prefs,
          comms: nextComms,
        },
      });

      setPrefs((prev) => ({ ...prev, comms: nextComms }));
      toast.success('Communications settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const sendingNumber = text(tenant.default_twilio_number);
  const supportPhone = text(tenant.support_phone);

  if (loading) {
    return (
      <div className="settings-page">
        <p className="settings-loading">Loading communications settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <p className="settings-eyebrow">Communications</p>
          <h1>SMS &amp; Messaging Settings</h1>
          <p className="settings-subtitle">
            Configure quiet hours, auto-response behavior, and first-touch SMS for this tenant.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={load} disabled={saving}>Reload</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </header>

      <div className="settings-cards-grid">

        {/* ── Sending Number (Read-Only) ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Sending Number</h2>
            <span className={`settings-status-badge ${sendingNumber ? 'is-ok' : 'is-warn'}`}>
              {sendingNumber ? 'Verified' : 'Not Set'}
            </span>
          </div>
          {sendingNumber ? (
            <div className="settings-kv-list">
              <div className="settings-kv"><span>Twilio Number</span><strong>{sendingNumber}</strong></div>
              {supportPhone && <div className="settings-kv"><span>Support Phone</span><strong>{supportPhone}</strong></div>}
            </div>
          ) : (
            <p className="settings-warning">
              No sending number configured. SMS will use the shared platform number.
              Contact support to assign a dedicated number.
            </p>
          )}
          <p className="settings-help">
            Read-only — sending number is configured at the platform level, not editable from this page.
          </p>
        </section>

        {/* ── Quiet Hours (Editable) ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Quiet Hours</h2>
            <span className={`settings-status-badge ${quietStart && quietEnd ? 'is-ok' : 'is-warn'}`}>
              {quietStart && quietEnd ? 'Configured' : 'Not Set'}
            </span>
          </div>
          <p className="settings-help">
            Campaigns will not send during quiet hours. Messages are deferred to the next morning.
          </p>
          <div className="settings-form-row">
            <label className="settings-form-field">
              <span>Quiet Start (no sends after)</span>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
              />
            </label>
            <label className="settings-form-field">
              <span>Quiet End (sends resume after)</span>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
              />
            </label>
          </div>
          <p className="settings-help">
            Note: Campaign quiet hours enforcement also depends on TenantCommsSettings in the backend database.
            If campaigns still send during quiet hours after saving here, verify the backend record.
          </p>
        </section>

        {/* ── Auto-Response Window (Editable) ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Auto-Response Window</h2>
          </div>
          <p className="settings-help">
            Time window during which AI-generated responses can be auto-sent (if auto-responder is enabled).
            Outside this window, AI creates draft suggestions only.
          </p>
          <TimeRangePicker
            label=""
            startLabel="Window Start"
            endLabel="Window End"
            value={autoResponseWindow}
            onChange={setAutoResponseWindow}
          />
        </section>

        {/* ── Auto-Responder Toggle (Editable) ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Auto-Responder</h2>
            <span className={`settings-status-badge ${autoResponderEnabled ? 'is-ok' : 'is-warn'}`}>
              {autoResponderEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={autoResponderEnabled}
              onChange={(e) => setAutoResponderEnabled(e.target.checked)}
            />
            <div>
              <strong>Enable AI auto-responses</strong>
              <p className="settings-help" style={{ margin: '2px 0 0' }}>
                {autoResponderEnabled
                  ? 'AI will auto-send replies to inbound questions when confidence is high. Low-confidence drafts require human review.'
                  : 'AI generates draft replies only. A human must review and send every response. Safest for new tenants.'}
              </p>
            </div>
          </label>
        </section>

        {/* ── First-Touch SMS Toggle (Editable) ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>First-Touch SMS</h2>
            <span className={`settings-status-badge ${firstTouchEnabled ? 'is-ok' : 'is-warn'}`}>
              {firstTouchEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={firstTouchEnabled}
              onChange={(e) => setFirstTouchEnabled(e.target.checked)}
            />
            <div>
              <strong>Auto-send welcome SMS to new leads</strong>
              <p className="settings-help" style={{ margin: '2px 0 0' }}>
                {firstTouchEnabled
                  ? 'New leads automatically receive a welcome SMS using the first-touch template. Template: "Hey {first_name}, thanks for contacting..."'
                  : 'New leads do not receive automatic SMS. First contact is manual.'}
              </p>
            </div>
          </label>
        </section>

        {/* ── DNC / Compliance (Read-Only) ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Compliance</h2>
            <span className="settings-status-badge is-ok">System-Enforced</span>
          </div>
          <div className="settings-kv-list">
            <div className="settings-kv"><span>STOP keyword handling</span><strong>Active</strong></div>
            <div className="settings-kv"><span>Do-Not-Contact enforcement</span><strong>Active</strong></div>
            <div className="settings-kv"><span>Campaign STOP footer</span><strong>Auto-appended</strong></div>
            <div className="settings-kv"><span>24h duplicate prevention</span><strong>Active</strong></div>
            <div className="settings-kv"><span>Daily per-customer cap</span><strong>3 SMS/day</strong></div>
            <div className="settings-kv"><span>Marketing cooldown</span><strong>1 per 7 days</strong></div>
          </div>
          <p className="settings-help">
            These compliance controls are enforced by the backend and cannot be disabled. They apply to all tenants.
          </p>
        </section>

      </div>
    </div>
  );
}
