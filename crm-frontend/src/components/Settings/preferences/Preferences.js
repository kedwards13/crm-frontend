import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../apiClient';
import { getIndustry } from '../../../helpers/tenantHelpers';
import TimeRangePicker from '../../ui/TimeRangePicker.tsx';
import { useTheme } from '../../../theme/ThemeProvider';
import '../SettingsCommon.css';

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
  const { mode, accent, setMode, setAccent, presets } = useTheme();
  const industryKey = getIndustry('general');
  const seed = DEFAULTS[industryKey] || DEFAULTS.general;

  const [prefs, setPrefs] = useState(seed);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [aiContext, setAiContext] = useState({
    tone: '',
    bio: '',
    instructions: '',
    metadata: null,
  });
  const [aiMeta, setAiMeta] = useState('');
  const [aiMsg, setAiMsg] = useState('');
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/accounts/preferences/");
        const serverPrefs = data?.preferences || {};
        if (!mounted) return;
        setPrefs({ ...seed, ...serverPrefs });
      } catch {
        setPrefs(seed);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [seed]); // re-seed if industry changes

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/accounts/ai-context/');
        if (!mounted) return;
        setAiContext({
          tone: data?.tone || '',
          bio: data?.bio || '',
          instructions: data?.instructions || '',
          metadata: data?.metadata || null,
        });
        setAiMeta(data?.metadata ? JSON.stringify(data.metadata, null, 2) : '');
      } catch {
        if (mounted) setAiContext({ tone: '', bio: '', instructions: '', metadata: null });
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onToggle = (k) => setPrefs(p => ({ ...p, [k]: !p[k] }));
  const onChange = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const pipelineCSV = useMemo(() => (prefs.pipeline || []).join(','), [prefs.pipeline]);
  const workingHours = useMemo(() => {
    if (prefs?.workingHours?.start && prefs?.workingHours?.end) return prefs.workingHours;
    if (seed?.workingHours?.start && seed?.workingHours?.end) return seed.workingHours;
    return DEFAULTS.general.workingHours;
  }, [prefs?.workingHours, seed?.workingHours]);

  const save = async () => {
    setMsg('');
    try {
      await api.patch("/accounts/preferences/", { preferences: prefs });
      setMsg('Saved ✓');
    } catch {
      setMsg('Save failed.');
    }
  };

  const saveAi = async () => {
    setAiMsg('');
    let metadata = null;
    if (aiMeta.trim()) {
      try {
        metadata = JSON.parse(aiMeta);
      } catch {
        setAiMsg('Metadata must be valid JSON.');
        return;
      }
    }

    try {
      await api.patch('/accounts/ai-context/', {
        tone: aiContext.tone,
        bio: aiContext.bio,
        instructions: aiContext.instructions,
        metadata,
      });
      setAiMsg('AI context saved ✓');
    } catch {
      setAiMsg('AI context save failed.');
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
              <TimeRangePicker
                label="Working Hours"
                value={workingHours}
                onChange={(nextRange) => onChange('workingHours', nextRange)}
              />
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

      {industryKey !== 'pest_control' && (
        <div className="settings-card">
          <TimeRangePicker
            label="Working Hours"
            value={workingHours}
            onChange={(nextRange) => onChange('workingHours', nextRange)}
          />
        </div>
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

      <button className="settings-primary" onClick={save}>Save Preferences</button>

      <div className="settings-card">
        <h3>Theme Preferences</h3>
        <p className="muted">Choose light or dark mode and set your workspace accent color.</p>
        <div className="settings-inline-actions">
          <button
            type="button"
            className="settings-secondary"
            onClick={() => setMode('light')}
            aria-pressed={mode === 'light'}
          >
            Light Mode
          </button>
          <button
            type="button"
            className="settings-secondary"
            onClick={() => setMode('dark')}
            aria-pressed={mode === 'dark'}
          >
            Dark Mode
          </button>
        </div>
        <div className="settings-inline-actions">
          {presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="mini"
              onClick={() => setAccent(preset.key)}
              aria-pressed={accent === preset.key}
              style={{
                borderColor: accent === preset.key ? 'var(--color-accent)' : undefined,
                background: `linear-gradient(120deg, ${preset.primary}, ${preset.secondary})`,
                color: '#fff',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h3>Customer Insight Context</h3>
        {aiMsg && <p className="settings-msg">{aiMsg}</p>}
        <label>Tone
          <input
            value={aiContext.tone}
            onChange={(e) => setAiContext((prev) => ({ ...prev, tone: e.target.value }))}
            placeholder="Professional, warm, concise…"
          />
        </label>
        <label>Bio
          <textarea
            rows="3"
            value={aiContext.bio}
            onChange={(e) => setAiContext((prev) => ({ ...prev, bio: e.target.value }))}
          />
        </label>
        <label>Instructions
          <textarea
            rows="4"
            value={aiContext.instructions}
            onChange={(e) => setAiContext((prev) => ({ ...prev, instructions: e.target.value }))}
          />
        </label>
        <label>Metadata (JSON)
          <textarea
            rows="4"
            value={aiMeta}
            onChange={(e) => setAiMeta(e.target.value)}
            placeholder='{"region":"South"}'
          />
        </label>
        <button className="settings-primary" onClick={saveAi}>Save AI Context</button>
      </div>
    </div>
  );
}
