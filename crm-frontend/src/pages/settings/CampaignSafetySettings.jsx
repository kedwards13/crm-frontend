import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../apiClient';
import { Button } from '../../components/ui/button';
import './SettingsLayout.css';

const text = (v) => String(v || '').trim();
const bool = (v) => v === true || v === 'true' || v === '1';

const STATUS_BADGE = ({ ok, label }) => (
  <span className={`settings-status-badge ${ok ? 'is-ok' : 'is-warn'}`}>
    {ok ? '✓' : '⚠'} {label}
  </span>
);

export default function CampaignSafetySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({});
  const [comms, setComms] = useState({});
  const [tenant, setTenant] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, meRes] = await Promise.all([
        api.get('/accounts/preferences/').catch(() => ({ data: {} })),
        api.get('/accounts/auth/me/').catch(() => ({ data: {} })),
      ]);
      const p = prefsRes.data?.preferences || prefsRes.data || {};
      const t = meRes.data?.tenant || meRes.data?.activeTenant || {};
      setPrefs(p);
      setComms(p.comms || p.communications || {});
      setTenant(t);
    } catch {
      toast.error('Unable to load campaign safety settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const aiSettings = prefs.ai_settings || {};
  const notifications = prefs.notifications || {};

  // Derived safety statuses
  const quietStart = text(comms.auto_response_start || comms.quiet_start || aiSettings.auto_response_start);
  const quietEnd = text(comms.auto_response_end || comms.quiet_end || aiSettings.auto_response_end);
  const hasQuietHours = !!(quietStart && quietEnd);
  const autoResponderEnabled = bool(aiSettings.texting_enabled || comms.auto_responder_enabled);
  const firstTouchEnabled = bool(comms.auto_first_touch_enabled);
  const sendingNumber = text(tenant.default_twilio_number);
  const supportPhone = text(tenant.support_phone);
  const smsAlertNumbers = Array.isArray(notifications.sms_alert_numbers) ? notifications.sms_alert_numbers : [];
  const hasReplyAlerts = smsAlertNumbers.length > 0;
  const industry = text(tenant.industry || prefs.industry?.type || 'general');

  if (loading) {
    return (
      <div className="settings-page">
        <p className="settings-loading">Loading campaign safety settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <p className="settings-eyebrow">Campaign Safety</p>
          <h1>Pre-Send Safety Configuration</h1>
          <p className="settings-subtitle">
            Verify these settings before sending any campaign. Items marked ⚠ need attention.
          </p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </header>

      <div className="settings-cards-grid">

        {/* ── Quiet Hours ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Quiet Hours</h2>
            <STATUS_BADGE ok={hasQuietHours} label={hasQuietHours ? 'Configured' : 'Not Configured'} />
          </div>
          {hasQuietHours ? (
            <div className="settings-kv-list">
              <div className="settings-kv"><span>Start</span><strong>{quietStart}</strong></div>
              <div className="settings-kv"><span>End</span><strong>{quietEnd}</strong></div>
            </div>
          ) : (
            <p className="settings-warning">
              ⚠ No quiet hours configured. Campaigns can send at any time of day.
              Set quiet hours in AI &amp; Automation settings or configure TenantCommsSettings in the backend.
            </p>
          )}
          <p className="settings-help">
            Campaign execution checks quiet hours before each send. Messages during quiet hours are deferred, not dropped.
          </p>
        </section>

        {/* ── STOP Footer ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>STOP Opt-Out Footer</h2>
            <STATUS_BADGE ok={true} label="Auto-Enforced" />
          </div>
          <p className="settings-help">
            The backend auto-appends "Reply STOP to opt out" to any campaign message that doesn't already contain STOP language.
            This is enforced at send time — you cannot bypass it.
          </p>
        </section>

        {/* ── Sending Number ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Sending Number</h2>
            <STATUS_BADGE ok={!!sendingNumber} label={sendingNumber ? 'Verified' : 'Not Set'} />
          </div>
          {sendingNumber ? (
            <div className="settings-kv-list">
              <div className="settings-kv"><span>Twilio Number</span><strong>{sendingNumber}</strong></div>
              {supportPhone && <div className="settings-kv"><span>Support Phone</span><strong>{supportPhone}</strong></div>}
            </div>
          ) : (
            <p className="settings-warning">
              ⚠ No default Twilio number set on this tenant. SMS will use the global Abon number, which customers won't recognize.
            </p>
          )}
        </section>

        {/* ── Reply Alert Routing ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Reply Alert Routing</h2>
            <STATUS_BADGE ok={hasReplyAlerts} label={hasReplyAlerts ? `${smsAlertNumbers.length} recipient(s)` : 'Not Configured'} />
          </div>
          {hasReplyAlerts ? (
            <div className="settings-kv-list">
              {smsAlertNumbers.map((num, i) => (
                <div key={i} className="settings-kv"><span>Alert #{i + 1}</span><strong>{num}</strong></div>
              ))}
            </div>
          ) : (
            <p className="settings-help">
              When a customer replies INTERESTED, the system sends an SMS alert to the tenant owner/admin's personal phone.
              Configure additional SMS alert numbers in Notification settings for wider coverage.
            </p>
          )}
          <p className="settings-help">
            Alert targets: owner phone_number → tenant support_phone → log warning (no Twilio number fallback).
          </p>
        </section>

        {/* ── Auto-Responder ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Auto-Responder</h2>
            <STATUS_BADGE ok={autoResponderEnabled} label={autoResponderEnabled ? 'Enabled' : 'Disabled'} />
          </div>
          <p className="settings-help">
            {autoResponderEnabled
              ? 'AI can auto-send replies to inbound questions when confidence is high enough. Drafts requiring review appear in the inbox.'
              : 'AI generates draft replies but does NOT auto-send. A human must review and send every response. This is the safest mode for new tenants.'}
          </p>
        </section>

        {/* ── First-Touch SMS ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>First-Touch SMS</h2>
            <STATUS_BADGE ok={false} label={firstTouchEnabled ? 'Enabled' : 'Disabled'} />
          </div>
          <p className="settings-help">
            {firstTouchEnabled
              ? 'New leads automatically receive a welcome SMS on creation. Template: "Hey {first_name}, thanks for contacting..."'
              : 'New leads do NOT receive automatic SMS. First contact is manual. Enable this in Communications settings when ready.'}
          </p>
        </section>

        {/* ── Booking Links ── */}
        <section className="settings-card settings-card-todo">
          <div className="settings-card-header">
            <h2>Booking Links</h2>
            <STATUS_BADGE ok={false} label="Not Available" />
          </div>
          <p className="settings-help">
            No public booking URL exists for this tenant. Do not include booking links in campaign messages.
            Auto-scheduling from campaign replies is not yet implemented — replies create follow-up tasks for manual call + book.
          </p>
        </section>

        {/* ── Review Link ── */}
        <section className="settings-card settings-card-todo">
          <div className="settings-card-header">
            <h2>Review Link</h2>
            <STATUS_BADGE ok={false} label="Not Configured" />
          </div>
          <p className="settings-help">
            No Google review URL is configured. The {'{{review_link}}'} template token will render as empty text.
            Do not send review request campaigns until a review link is configured.
          </p>
          <p className="settings-todo">
            🔧 Backend needs a review_link field on the Tenant model or in preferences.
          </p>
        </section>

        {/* ── Industry ── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Industry</h2>
            <span className="settings-status-badge is-ok">{industry}</span>
          </div>
          <p className="settings-help">
            Industry determines default scheduling labels, pipeline stages, service categories, and campaign audience segments.
          </p>
        </section>

      </div>
    </div>
  );
}
