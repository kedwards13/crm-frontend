// @ts-nocheck
import React from 'react';

const PERSONA_OPTIONS = [
  {
    key: 'Professional',
    title: 'Professional',
    description: 'Measured language, formal tone, high trust responses.',
  },
  {
    key: 'Friendly',
    title: 'Friendly',
    description: 'Warm and conversational messaging with helpful context.',
  },
  {
    key: 'Direct',
    title: 'Direct',
    description: 'Short, action-first responses focused on speed and clarity.',
  },
];

const OFF_HOURS_OPTIONS = [
  {
    key: 'voicemail',
    title: 'Voicemail',
    description: 'After hours calls go to voicemail workflow.',
  },
  {
    key: 'ai_assistant',
    title: 'AI Assistant',
    description: 'AI agent handles after-hours conversations first.',
  },
  {
    key: 'forward',
    title: 'Forward Calls',
    description: 'Forward after-hours calls to your route targets.',
  },
];

export default function AISettings({ value, onChange }) {
  const update = (patch) => onChange({ ...(value || {}), ...(patch || {}) });

  return (
    <div className="tenant-settings-tab-panel">
      <section className="tenant-settings-panel tenant-settings-panel-highlight">
        <div className="tenant-settings-panel-head">
          <h3>AI Texting (Master Switch)</h3>
          <p>Enable or pause tenant-wide AI texting automation.</p>
        </div>

        <button
          type="button"
          className={`tenant-master-switch ${value?.texting_enabled ? 'is-on' : 'is-off'}`}
          aria-pressed={!!value?.texting_enabled}
          onClick={() => update({ texting_enabled: !value?.texting_enabled })}
        >
          <span className="tenant-master-switch-state">
            {value?.texting_enabled ? 'AI Texting Enabled' : 'AI Texting Disabled'}
          </span>
          <span className="tenant-master-switch-hint">
            {value?.texting_enabled
              ? 'AI can send automated text responses when workflow conditions are met.'
              : 'AI texting responses are paused for this tenant.'}
          </span>
        </button>
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>AI Active Hours</h3>
          <p>Outside this window, the system defaults to Voicemail handling.</p>
        </div>

        <div className="tenant-active-hours-grid">
          <div className="tenant-settings-field">
            <label className="tenant-settings-label" htmlFor="ai-active-start">
              Start Time
            </label>
            <input
              id="ai-active-start"
              type="time"
              className="tenant-input"
              value={value?.auto_response_start || ''}
              onChange={(event) => update({ auto_response_start: event.target.value })}
            />
          </div>

          <div className="tenant-settings-field">
            <label className="tenant-settings-label" htmlFor="ai-active-end">
              End Time
            </label>
            <input
              id="ai-active-end"
              type="time"
              className="tenant-input"
              value={value?.auto_response_end || ''}
              onChange={(event) => update({ auto_response_end: event.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Auto-Reply Delay</h3>
          <p>Set the natural pause before AI sends a response.</p>
        </div>

        <div className="tenant-slider-wrap">
          <div className="tenant-slider-header">
            <span>Delay</span>
            <strong>{value?.auto_reply_delay_seconds || 0}s</strong>
          </div>
          <input
            type="range"
            min={0}
            max={300}
            step={5}
            value={value?.auto_reply_delay_seconds || 0}
            className="tenant-slider"
            onChange={(event) =>
              update({ auto_reply_delay_seconds: Number(event.target.value) })
            }
          />
          <div className="tenant-slider-marks">
            <span>0s</span>
            <span>60s</span>
            <span>120s</span>
            <span>180s</span>
            <span>240s</span>
            <span>300s</span>
          </div>
        </div>
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>AI Persona</h3>
          <p>Select the default personality for outbound AI responses.</p>
        </div>

        <div className="tenant-card-grid" role="radiogroup" aria-label="AI persona">
          {PERSONA_OPTIONS.map((option) => {
            const selected = value?.ai_persona === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`tenant-choice-card ${selected ? 'is-selected' : ''}`}
                onClick={() => update({ ai_persona: option.key })}
              >
                <span className="tenant-choice-card-title">{option.title}</span>
                <span className="tenant-choice-card-text">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>After-Hours Behavior</h3>
          <p>Define how conversations should be handled outside business hours.</p>
        </div>

        <div className="tenant-card-grid" role="radiogroup" aria-label="After-hours behavior">
          {OFF_HOURS_OPTIONS.map((option) => {
            const selected = value?.off_hours_behavior === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`tenant-choice-card ${selected ? 'is-selected' : ''}`}
                onClick={() => update({ off_hours_behavior: option.key })}
              >
                <span className="tenant-choice-card-title">{option.title}</span>
                <span className="tenant-choice-card-text">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
