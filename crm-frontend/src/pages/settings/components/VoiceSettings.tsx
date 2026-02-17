// @ts-nocheck
import React from 'react';
import TagInput from './TagInput.tsx';

const phonePattern = /^\+?[0-9()\-\s]{7,20}$/;

const ROUTE_OPTIONS = [
  {
    key: 'ring_group',
    title: 'Ring Group',
    description: 'Route calls to one or more team targets simultaneously or in sequence.',
  },
  {
    key: 'ai_first',
    title: 'AI First',
    description: 'AI assistant answers first, then escalates to a person when needed.',
  },
  {
    key: 'single_user',
    title: 'Single User',
    description: 'Route calls directly to one primary contact number.',
  },
];

export default function VoiceSettings({ value, onChange }) {
  const update = (patch) => onChange({ ...(value || {}), ...(patch || {}) });

  const routeMode = value?.inbound_route_mode || 'ring_group';
  const targetLabel = routeMode === 'single_user' ? 'Single user target' : 'Ring group targets';
  const helperText =
    routeMode === 'single_user'
      ? 'Single User mode requires exactly one number.'
      : 'Ring Group mode requires at least one number.';

  return (
    <div className="tenant-settings-tab-panel">
      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Inbound Route Mode</h3>
          <p>Choose how inbound calls are routed during open hours.</p>
        </div>

        <div className="tenant-card-grid" role="radiogroup" aria-label="Inbound route mode">
          {ROUTE_OPTIONS.map((option) => {
            const selected = routeMode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`tenant-choice-card ${selected ? 'is-selected' : ''}`}
                onClick={() => update({ inbound_route_mode: option.key })}
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
          <h3>Route Targets</h3>
          <p>Configure where calls should ring or forward.</p>
        </div>

        <TagInput
          label={targetLabel}
          values={value?.ring_group_targets || []}
          onChange={(ring_group_targets) => update({ ring_group_targets })}
          placeholder="+1 555 123 4567"
          helperText={helperText}
          validate={(candidate) =>
            phonePattern.test(candidate) || 'Enter a valid phone number before adding.'
          }
          normalize={(candidate) => candidate.replace(/\s+/g, ' ').trim()}
        />
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-settings-panel-head">
          <h3>Voice Engine</h3>
          <p>Set the active voice profile identifier used by your AI runtime.</p>
        </div>

        <div className="tenant-settings-field">
          <label className="tenant-settings-label" htmlFor="voice-id-input">
            Voice ID
          </label>
          <input
            id="voice-id-input"
            type="text"
            className="tenant-input"
            placeholder="elevenlabs_voice_id"
            value={value?.voice_id || ''}
            onChange={(event) => update({ voice_id: event.target.value })}
          />
          <p className="tenant-settings-helper">
            This value maps to `voice.voice_id` for pass-through runtime configuration.
          </p>
        </div>
      </section>

      <section className="tenant-settings-panel">
        <div className="tenant-toggle-row">
          <div>
            <p className="tenant-toggle-title">Record inbound calls</p>
            <p className="tenant-toggle-subtitle">
              Enable recording metadata for inbound routing and call review workflows.
            </p>
          </div>

          <button
            type="button"
            className={`tenant-switch ${value?.record_calls ? 'is-on' : ''}`}
            aria-pressed={!!value?.record_calls}
            onClick={() => update({ record_calls: !value?.record_calls })}
          >
            <span className="tenant-switch-track" />
            <span className="tenant-switch-thumb" />
          </button>
        </div>
      </section>
    </div>
  );
}
