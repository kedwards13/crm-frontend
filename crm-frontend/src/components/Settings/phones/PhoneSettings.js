import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../apiClient';
import '../SettingsCommon.css';

const DEFAULT_VOICE = {
  enabled: true,
  voice_enabled: true,
  ai_enabled: true,
  booking_enabled: true,
  system_prompt: '',
  provider: 'google',
  language_code: 'en-US',
  voice_name: '',
  voice: '',
  default_voice: 'female',
  greeting: '',
  greeting_text: '',
  tree_id: '',
  routing_tree: null,
  rules: null,
  fallback_number: '',
  fallback_phone: '',
  business_hours: null,
  inbound_numbers: [],
  twilio: {
    account_sid: '',
    auth_token: '',
    api_key_sid: '',
    api_key_secret: '',
    from_number: '',
    account_sid_secret: '',
    auth_token_secret: '',
    api_key_sid_secret: '',
    api_key_secret_secret: '',
    from_number_secret: '',
  },
};

export default function PhoneSettings() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({});
  const [voice, setVoice] = useState(DEFAULT_VOICE);
  const [msg, setMsg] = useState('');
  const [inboundNumbers, setInboundNumbers] = useState('');
  const [routingTreeJson, setRoutingTreeJson] = useState('');
  const [rulesJson, setRulesJson] = useState('');
  const [businessHoursJson, setBusinessHoursJson] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/accounts/preferences/');
        const prefs = data?.preferences || {};
        const voicePrefs = { ...DEFAULT_VOICE, ...(prefs.voice || {}) };
        if (!mounted) return;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[PhoneSettings] resolved voice payload', voicePrefs);
        }
        setPreferences(prefs);
        setVoice(voicePrefs);
        setInboundNumbers((voicePrefs.inbound_numbers || []).join(', '));
        setRoutingTreeJson(
          voicePrefs.routing_tree ? JSON.stringify(voicePrefs.routing_tree, null, 2) : ''
        );
        setRulesJson(voicePrefs.rules ? JSON.stringify(voicePrefs.rules, null, 2) : '');
        setBusinessHoursJson(
          voicePrefs.business_hours ? JSON.stringify(voicePrefs.business_hours, null, 2) : ''
        );
      } catch {
        setPreferences({});
        setVoice(DEFAULT_VOICE);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const updateVoice = (key, value) => {
    setVoice((prev) => ({ ...prev, [key]: value }));
  };

  const updateTwilio = (key, value) => {
    setVoice((prev) => ({
      ...prev,
      twilio: { ...(prev.twilio || {}), [key]: value },
    }));
  };

  const hasPrompt = useMemo(() => (voice.system_prompt || '').trim().length > 0, [voice.system_prompt]);

  const parseJson = (label, raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      setMsg(`${label} must be valid JSON.`);
      return null;
    }
  };

  const save = async () => {
    setMsg('');
    const routingTree = parseJson('Routing tree', routingTreeJson);
    if (routingTreeJson && routingTree == null) return;
    const rules = parseJson('Rules', rulesJson);
    if (rulesJson && rules == null) return;
    const businessHours = parseJson('Business hours', businessHoursJson);
    if (businessHoursJson && businessHours == null) return;

    const nextVoice = {
      ...voice,
      inbound_numbers: inboundNumbers
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
      routing_tree: routingTreeJson ? routingTree : null,
      rules: rulesJson ? rules : null,
      business_hours: businessHoursJson ? businessHours : null,
    };

    if (!nextVoice.system_prompt?.trim()) {
      setMsg('System prompt is required for voice resolution.');
      return;
    }

    try {
      await api.patch('/accounts/preferences/', {
        preferences: { ...preferences, voice: nextVoice },
      });
      setPreferences((prev) => ({ ...prev, voice: nextVoice }));
      setVoice(nextVoice);
      setMsg('Saved ✓');
    } catch {
      setMsg('Save failed.');
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
      <h2>Voice & Phone Settings</h2>
      {msg && <p className="settings-msg">{msg}</p>}

      <div className="settings-card two-col">
        <div>
          <h3>Enablement</h3>
          <label className="row">
            <input
              type="checkbox"
              checked={!!voice.enabled}
              onChange={() => updateVoice('enabled', !voice.enabled)}
            />
            <span>Voice suite enabled</span>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={!!voice.voice_enabled}
              onChange={() => updateVoice('voice_enabled', !voice.voice_enabled)}
            />
            <span>Voice calls enabled</span>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={!!voice.ai_enabled}
              onChange={() => updateVoice('ai_enabled', !voice.ai_enabled)}
            />
            <span>AI assistance enabled</span>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={!!voice.booking_enabled}
              onChange={() => updateVoice('booking_enabled', !voice.booking_enabled)}
            />
            <span>Booking enabled</span>
          </label>
        </div>
        <div>
          <h3>Caller Experience</h3>
          <label>Greeting
            <input
              value={voice.greeting || ''}
              onChange={(e) => updateVoice('greeting', e.target.value)}
              placeholder="Thanks for calling..."
            />
          </label>
          <label>Greeting Text
            <input
              value={voice.greeting_text || ''}
              onChange={(e) => updateVoice('greeting_text', e.target.value)}
              placeholder="Short intro"
            />
          </label>
          <label>System Prompt {hasPrompt ? '' : '(required)'}
            <textarea
              rows="4"
              value={voice.system_prompt || ''}
              onChange={(e) => updateVoice('system_prompt', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="settings-card two-col">
        <div>
          <h3>Voice Provider</h3>
          <label>Provider
            <input
              value={voice.provider || ''}
              onChange={(e) => updateVoice('provider', e.target.value)}
              placeholder="google"
            />
          </label>
          <label>Language Code
            <input
              value={voice.language_code || ''}
              onChange={(e) => updateVoice('language_code', e.target.value)}
              placeholder="en-US"
            />
          </label>
          <label>Voice Name
            <input
              value={voice.voice_name || ''}
              onChange={(e) => updateVoice('voice_name', e.target.value)}
              placeholder="en-US-ChirpV3"
            />
          </label>
          <label>Voice Alias
            <input
              value={voice.voice || ''}
              onChange={(e) => updateVoice('voice', e.target.value)}
              placeholder="Achernar"
            />
          </label>
          <label>Default Voice
            <input
              value={voice.default_voice || ''}
              onChange={(e) => updateVoice('default_voice', e.target.value)}
              placeholder="female"
            />
          </label>
        </div>
        <div>
          <h3>Routing</h3>
          <label>Routing Tree ID
            <input
              value={voice.tree_id || ''}
              onChange={(e) => updateVoice('tree_id', e.target.value)}
              placeholder="tree-id"
            />
          </label>
          <label>Fallback Number
            <input
              value={voice.fallback_number || ''}
              onChange={(e) => updateVoice('fallback_number', e.target.value)}
              placeholder="+1..."
            />
          </label>
          <label>Fallback Phone
            <input
              value={voice.fallback_phone || ''}
              onChange={(e) => updateVoice('fallback_phone', e.target.value)}
              placeholder="+1..."
            />
          </label>
          <label>Inbound Numbers (comma-separated)
            <input
              value={inboundNumbers}
              onChange={(e) => setInboundNumbers(e.target.value)}
              placeholder="+123..., +1555..."
            />
          </label>
        </div>
      </div>

      <div className="settings-card two-col">
        <div>
          <h3>Routing Tree JSON</h3>
          <textarea
            rows="6"
            value={routingTreeJson}
            onChange={(e) => setRoutingTreeJson(e.target.value)}
            placeholder='{"id":"tree","...": "..."}'
          />
        </div>
        <div>
          <h3>Rules JSON</h3>
          <textarea
            rows="6"
            value={rulesJson}
            onChange={(e) => setRulesJson(e.target.value)}
            placeholder='{"rule":"value"}'
          />
        </div>
      </div>

      <div className="settings-card">
        <h3>Business Hours JSON</h3>
        <textarea
          rows="5"
          value={businessHoursJson}
          onChange={(e) => setBusinessHoursJson(e.target.value)}
          placeholder='{"mon":{"start":"09:00","end":"17:00"}}'
        />
      </div>

      <div className="settings-card two-col">
        <div>
          <h3>Twilio Credentials</h3>
          <label>Account SID
            <input
              value={voice.twilio?.account_sid || ''}
              onChange={(e) => updateTwilio('account_sid', e.target.value)}
            />
          </label>
          <label>Auth Token
            <input
              value={voice.twilio?.auth_token || ''}
              onChange={(e) => updateTwilio('auth_token', e.target.value)}
            />
          </label>
          <label>API Key SID
            <input
              value={voice.twilio?.api_key_sid || ''}
              onChange={(e) => updateTwilio('api_key_sid', e.target.value)}
            />
          </label>
          <label>API Key Secret
            <input
              value={voice.twilio?.api_key_secret || ''}
              onChange={(e) => updateTwilio('api_key_secret', e.target.value)}
            />
          </label>
          <label>From Number
            <input
              value={voice.twilio?.from_number || ''}
              onChange={(e) => updateTwilio('from_number', e.target.value)}
            />
          </label>
        </div>
        <div>
          <h3>Twilio Secret Names</h3>
          <label>Account SID Secret
            <input
              value={voice.twilio?.account_sid_secret || ''}
              onChange={(e) => updateTwilio('account_sid_secret', e.target.value)}
            />
          </label>
          <label>Auth Token Secret
            <input
              value={voice.twilio?.auth_token_secret || ''}
              onChange={(e) => updateTwilio('auth_token_secret', e.target.value)}
            />
          </label>
          <label>API Key SID Secret
            <input
              value={voice.twilio?.api_key_sid_secret || ''}
              onChange={(e) => updateTwilio('api_key_sid_secret', e.target.value)}
            />
          </label>
          <label>API Key Secret Secret
            <input
              value={voice.twilio?.api_key_secret_secret || ''}
              onChange={(e) => updateTwilio('api_key_secret_secret', e.target.value)}
            />
          </label>
          <label>From Number Secret
            <input
              value={voice.twilio?.from_number_secret || ''}
              onChange={(e) => updateTwilio('from_number_secret', e.target.value)}
            />
          </label>
        </div>
      </div>

      <button className="settings-primary" onClick={save}>Save</button>
    </div>
  );
}
