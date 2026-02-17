// @ts-nocheck
import React from 'react';
import TagInput from './TagInput.tsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9()\-\s]{7,20}$/;

export default function NotificationSettings({ value, onChange }) {
  const update = (patch) => onChange({ ...(value || {}), ...(patch || {}) });

  return (
    <div className="tenant-settings-tab-panel">
      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Lead Notification Recipients</h3>
          <p>Add the emails that should receive new lead alerts.</p>
        </div>

        <TagInput
          label="Lead notification emails"
          values={value?.lead_notification_emails || []}
          onChange={(lead_notification_emails) => update({ lead_notification_emails })}
          placeholder="name@company.com"
          helperText="Press Enter to add each recipient. Paste comma-separated emails to add in bulk."
          validate={(candidate) =>
            emailPattern.test(candidate) || 'Enter a valid email address before adding.'
          }
          normalize={(candidate) => candidate.trim().toLowerCase()}
        />
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>SMS Alert Recipients</h3>
          <p>High-priority alerts can be routed to these phone numbers.</p>
        </div>

        <TagInput
          label="SMS alert numbers"
          values={value?.sms_alert_numbers || []}
          onChange={(sms_alert_numbers) => update({ sms_alert_numbers })}
          placeholder="+1 (555) 123-4567"
          helperText="Use E.164 format when possible for best compatibility."
          validate={(candidate) =>
            phonePattern.test(candidate) || 'Enter a valid phone number before adding.'
          }
          normalize={(candidate) => candidate.replace(/\s+/g, ' ').trim()}
        />
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Digest Notifications</h3>
          <p>Send a daily summary of lead and communication activity.</p>
        </div>

        <div className="tenant-toggle-row">
          <div>
            <p className="tenant-toggle-title">Enable daily digest</p>
            <p className="tenant-toggle-subtitle">Automatically send one summary every business day.</p>
          </div>

          <button
            type="button"
            className={`tenant-switch ${value?.daily_digest_enabled ? 'is-on' : ''}`}
            aria-pressed={!!value?.daily_digest_enabled}
            onClick={() => update({ daily_digest_enabled: !value?.daily_digest_enabled })}
          >
            <span className="tenant-switch-track" />
            <span className="tenant-switch-thumb" />
          </button>
        </div>
      </section>
    </div>
  );
}
