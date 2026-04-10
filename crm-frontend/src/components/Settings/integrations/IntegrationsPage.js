import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../apiClient';
import '../SettingsCommon.css';

const DEFAULT_STATE = {
  sunpest_enabled: false,
  fieldroutes_enabled: false,
  sunpest_api_key: '',
  fieldroutes_api_key: '',
  sunpest_api_secret: '',
  fieldroutes_api_secret: '',
  sunpest_integration_id: null,
  fieldroutes_integration_id: null,
  sunpest_has_api_key: false,
  fieldroutes_has_api_key: false,
};

const ITEMS = [
  { key: 'sunpest', label: 'Sunpest', description: 'Pest customer, job, and service plan sync' },
  { key: 'fieldroutes', label: 'FieldRoutes', description: 'Customer and appointment sync' },
];

const providers = ['sunpest', 'fieldroutes'];

export default function IntegrationsPage() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadIntegrations = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/integrations/');
        const rows = Array.isArray(data) ? data : data?.results || [];
        const next = { ...DEFAULT_STATE };
        rows.forEach((row) => {
          const provider = String(row?.provider || '').toLowerCase();
          if (!providers.includes(provider)) return;
          next[`${provider}_enabled`] = !!row?.enabled;
          next[`${provider}_integration_id`] = row?.id || null;
          next[`${provider}_has_api_key`] = !!row?.has_api_key;
        });
        if (!mounted) return;
        setState(next);
      } catch {
        if (mounted) setState(DEFAULT_STATE);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadIntegrations();
    return () => {
      mounted = false;
    };
  }, []);

  const enabledCount = useMemo(
    () => providers.filter((provider) => !!state[`${provider}_enabled`]).length,
    [state]
  );

  const onToggle = (key) => setState((prev) => ({ ...prev, [key]: !prev[key] }));

  const onChange = (event) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      for (const provider of providers) {
        const integrationId = state[`${provider}_integration_id`];
        const payload = {
          provider,
          enabled: !!state[`${provider}_enabled`],
        };
        const apiKey = String(state[`${provider}_api_key`] || '').trim();
        const apiSecret = String(state[`${provider}_api_secret`] || '').trim();
        if (apiKey) payload.api_key = apiKey;
        if (apiSecret) payload.api_secret = apiSecret;

        if (integrationId) {
          const { data } = await api.patch(`/integrations/${integrationId}/`, payload);
          setState((prev) => ({
            ...prev,
            [`${provider}_has_api_key`]: !!data?.has_api_key || prev[`${provider}_has_api_key`],
          }));
          continue;
        }

        if (apiKey) {
          const { data } = await api.post('/integrations/', payload);
          setState((prev) => ({
            ...prev,
            [`${provider}_integration_id`]: data?.id || prev[`${provider}_integration_id`],
            [`${provider}_has_api_key`]: !!data?.has_api_key,
          }));
        }
      }
      setMessage('Integration settings saved.');
      setState((prev) => ({
        ...prev,
        sunpest_api_key: '',
        fieldroutes_api_key: '',
        sunpest_api_secret: '',
        fieldroutes_api_secret: '',
      }));
    } catch {
      setMessage('Unable to save integration settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='settings-page'>
        <p>Loading integrations…</p>
      </div>
    );
  }

  return (
    <div className='settings-page'>
      <h2>Integrations</h2>
      <p className='settings-sub'>Manage active provider connections for communications, payments, and routing.</p>
      {message ? <p className='settings-msg'>{message}</p> : null}

      <div className='settings-card'>
        <div className='row-between'>
          <h3>Connection Status</h3>
          <span className='settings-pill'>{enabledCount} active</span>
        </div>
        <div className='settings-list-grid'>
          {ITEMS.map((item) => {
            const provider = item.key;
            return (
            <label key={provider} className='settings-integration-row'>
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
                <p>
                  {state[`${provider}_has_api_key`]
                    ? 'API key configured'
                    : 'No API key configured'}
                </p>
              </div>
              <input
                type='checkbox'
                checked={!!state[`${provider}_enabled`]}
                onChange={() => onToggle(`${provider}_enabled`)}
              />
            </label>
            );
          })}
        </div>
      </div>

      <div className='settings-card two-col'>
        <label>
          Sunpest API Key
          <input
            name='sunpest_api_key'
            value={state.sunpest_api_key}
            onChange={onChange}
            placeholder='Enter Sunpest API key'
          />
        </label>
        <label>
          Sunpest API Secret
          <input
            name='sunpest_api_secret'
            value={state.sunpest_api_secret}
            onChange={onChange}
            placeholder='Optional Sunpest API secret'
          />
        </label>
        <label>
          FieldRoutes API Key
          <input
            name='fieldroutes_api_key'
            value={state.fieldroutes_api_key}
            onChange={onChange}
            placeholder='Enter FieldRoutes API key'
          />
        </label>
        <label>
          FieldRoutes API Secret
          <input
            name='fieldroutes_api_secret'
            value={state.fieldroutes_api_secret}
            onChange={onChange}
            placeholder='Optional FieldRoutes API secret'
          />
        </label>
      </div>

      <button type='button' className='settings-primary' onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Integration Settings'}
      </button>
    </div>
  );
}
