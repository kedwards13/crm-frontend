import React, { useEffect, useState } from 'react';
import api from '../../../apiClient';
import '../SettingsCommon.css';

export default function Automations() {
  const [rules, setRules] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/accounts/preferences/');
        const automationRules = data?.preferences?.automation_rules;
        if (!mounted) return;
        setRules(Array.isArray(automationRules) ? automationRules : []);
      } catch {
        setRules([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const add = () => setRules(r => [...r, { event: 'lead.created', action: 'send_sms', enabled: true }]);
  const update = (i, k, v) => setRules(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const remove = (i) => setRules(arr => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setMsg('');
    try {
      await api.patch('/accounts/preferences/', {
        preferences: {
          automation_rules: rules,
        },
      });
      setMsg('Saved ✓');
    } catch {
      setMsg('Save failed.');
    }
  };

  return (
    <div className="settings-page">
      <h2>Automations</h2>
      {msg && <p className="settings-msg">{msg}</p>}
      <div className="settings-card">
        <div className="table-like">
          <div className="row header">
            <div>Event</div><div>Action</div><div>Enabled</div><div></div>
          </div>
          {rules.map((r, i) => (
            <div key={i} className="row">
              <input value={r.event} onChange={(e)=>update(i,'event',e.target.value)} placeholder="lead.created" />
              <input value={r.action} onChange={(e)=>update(i,'action',e.target.value)} placeholder="send_sms" />
              <input type="checkbox" checked={!!r.enabled} onChange={(e)=>update(i,'enabled',e.target.checked)} />
              <button className="mini danger" onClick={()=>remove(i)}>Delete</button>
            </div>
          ))}
        </div>
        <button className="mini" onClick={add}>Add rule</button>
      </div>
      <button className="settings-primary" onClick={save}>Save</button>
    </div>
  );
}
