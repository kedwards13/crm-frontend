import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getIndustry } from '../../../helpers/tenantHelpers';
import '../SettingsCommon.css';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:808';

const DEFAULTS = {
  general: {
    pipeline: ['new','contacted','offered','closed','disqualified'],
    autoAssign: false,
    workingHours: { start: '08:00', end: '18:00' },
  },
  pest_control: {
    pipeline: ['new','offered','booked','scheduled','completed','lost'],
    enableRouteOptimization: true,
    defaultServiceWindowMins: 90,
    autoAssign: true,
    workingHours: { start: '07:00', end: '17:00' },
  },
  wholesaler: {
    pipeline: ['new','qualified','offered','under_contract','closed','dead'],
    offerExpiryDays: 14,
    autoAssign: false,
  },
  real_estate: {
    pipeline: ['new','qualified','offered','under_contract','closed','dead'],
    requireProofOfFunds: true,
  },
  fitness: {
    pipeline: ['new','trial','booked','won','lost'],
    defaultTrialDays: 7,
    autoAssign: true,
  }
};

export default function Preferences() {
  const industryKey = getIndustry('general');
  const seed = DEFAULTS[industryKey] || DEFAULTS.general;

  const [prefs, setPrefs] = useState(seed);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/settings/preferences/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!mounted) return;
        setPrefs({ ...seed, ...(data || {}) });
      } catch {
        setPrefs(seed);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, industryKey]); // re-seed if industry changes

  const onToggle = (k) => setPrefs(p => ({ ...p, [k]: !p[k] }));
  const onChange = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const pipelineCSV = useMemo(() => (prefs.pipeline || []).join(','), [prefs.pipeline]);

  const save = async () => {
    setMsg('');
    try {
      await axios.put(`${API}/api/settings/preferences/`, prefs, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Saved ✓');
    } catch {
      setMsg('Save failed.');
    }
  };

  if (loading) return <div className="settings-page"><p>Loading…</p></div>;

  return (
    <div className="settings-page">
      <h2>Preferences</h2>
      {msg && <p className="settings-msg">{msg}</p>}

      <div className="settings-card">
        <h3>Pipeline Stages ({industryKey})</h3>
        <p className="muted">Comma‑separated list, left→right order.</p>
        <input
          value={pipelineCSV}
          onChange={(e) => onChange('pipeline', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        />
      </div>

      {industryKey === 'pest_control' && (
        <>
          <div className="settings-card">
            <h3>Scheduling</h3>
            <label className="row">
              <input type="checkbox"
                     checked={!!prefs.enableRouteOptimization}
                     onChange={() => onToggle('enableRouteOptimization')} />
              <span>Enable route optimization</span>
            </label>

            <label>Default service window (mins)
              <input type="number"
                     value={prefs.defaultServiceWindowMins ?? 90}
                     onChange={(e)=>onChange('defaultServiceWindowMins', Number(e.target.value||0))}/>
            </label>
          </div>

          <div className="settings-card two-col">
            <div>
              <h3>Working Hours</h3>
              <label>Start
                <input type="time" value={prefs.workingHours?.start || '07:00'}
                       onChange={(e)=>onChange('workingHours', { ...prefs.workingHours, start: e.target.value })}/>
              </label>
              <label>End
                <input type="time" value={prefs.workingHours?.end || '17:00'}
                       onChange={(e)=>onChange('workingHours', { ...prefs.workingHours, end: e.target.value })}/>
              </label>
            </div>
            <div>
              <h3>Assignment</h3>
              <label className="row">
                <input type="checkbox" checked={!!prefs.autoAssign} onChange={()=>onToggle('autoAssign')}/>
                <span>Auto‑assign new bookings to available techs</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Other industry‑specific blocks */}
      {industryKey === 'wholesaler' && (
        <div className="settings-card">
          <h3>Offers</h3>
          <label>Offer expiry (days)
            <input type="number" value={prefs.offerExpiryDays ?? 14}
                   onChange={(e)=>onChange('offerExpiryDays', Number(e.target.value||0))}/>
          </label>
        </div>
      )}

      {industryKey === 'fitness' && (
        <div className="settings-card">
          <h3>Trials</h3>
          <label>Default trial length (days)
            <input type="number" value={prefs.defaultTrialDays ?? 7}
                   onChange={(e)=>onChange('defaultTrialDays', Number(e.target.value||0))}/>
          </label>
        </div>
      )}

      <button className="settings-primary" onClick={save}>Save</button>
    </div>
  );
}