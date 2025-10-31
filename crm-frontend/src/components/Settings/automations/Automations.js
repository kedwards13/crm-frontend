import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../SettingsCommon.css';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:808';

export default function Automations() {
  const [rules, setRules] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/settings/automations/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (mounted) setRules(Array.isArray(data) ? data : []);
      } catch {
        setRules([]);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const add = () => setRules(r => [...r, { event: 'lead.created', action: 'send_sms', enabled: true }]);
  const update = (i, k, v) => setRules(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const remove = (i) => setRules(arr => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setMsg('');
    try {
      await axios.put(`${API}/api/settings/automations/`, { rules }, {
        headers: { Authorization: `Bearer ${token}` }
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