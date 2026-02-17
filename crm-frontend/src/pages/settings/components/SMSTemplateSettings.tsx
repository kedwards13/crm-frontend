// @ts-nocheck
import React from 'react';

const TOKEN_OPTIONS = ['{{first_name}}', '{{appointment_date}}', '{{company_name}}', '{{review_link}}'];

function TemplateEditor({ id, label, description, value, onChange }) {
  const insertToken = (token) => {
    const base = value || '';
    const spacer = base.trim().length > 0 && !base.endsWith(' ') ? ' ' : '';
    onChange(`${base}${spacer}${token}`);
  };

  return (
    <div className="tenant-template-editor">
      <label className="tenant-settings-label" htmlFor={id}>
        {label}
      </label>
      <p className="tenant-settings-helper">{description}</p>

      <div className="tenant-token-row">
        {TOKEN_OPTIONS.map((token) => (
          <button
            key={token}
            type="button"
            className="tenant-token-btn"
            onClick={() => insertToken(token)}
          >
            {token}
          </button>
        ))}
      </div>

      <textarea
        id={id}
        rows={5}
        className="tenant-textarea"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type your template message..."
      />

      <div className="tenant-template-footer">
        <span>{(value || '').length} characters</span>
      </div>
    </div>
  );
}

export default function SMSTemplateSettings({ value, onChange }) {
  const update = (patch) => onChange({ ...(value || {}), ...(patch || {}) });

  return (
    <div className="tenant-settings-tab-panel">
      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Appointment Confirmation Template</h3>
          <p>Used for appointment confirmation and reminder SMS flows.</p>
        </div>

        <TemplateEditor
          id="appointment-confirmation-template"
          label="Appointment confirmation"
          description="Keep this concise and include clear confirmation details."
          value={value?.appointment_confirmation_template || ''}
          onChange={(appointment_confirmation_template) =>
            update({ appointment_confirmation_template })
          }
        />
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Review Request Template</h3>
          <p>Used for post-service review request automations.</p>
        </div>

        <TemplateEditor
          id="review-request-template"
          label="Review request"
          description="Include a clear ask and short CTA to improve conversion."
          value={value?.review_request_template || ''}
          onChange={(review_request_template) => update({ review_request_template })}
        />
      </section>
    </div>
  );
}
