import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Assistant from '../Assistant/Assistant';
import CustomerPopup from '../Profile/CustomerPopup';
import FiltersBar from '../Layout/FiltersBar';
import { getIndustry } from '../../utils/tenantHelpers';
import { getPipelineConfig } from '../../constants/pipelineRegistry';
import './Pipeline.css';

const API_BASE = process.env.REACT_APP_API_BASE;

function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), timeoutMs);
  return fetch(url, { ...options, signal: c.signal }).finally(() => clearTimeout(id));
}

function useDebounced(v, delay = 250) {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), delay);
    return () => clearTimeout(t);
  }, [v, delay]);
  return val;
}

const PAGE_SIZE = 30;

export default function PipelineView() {
  const industry = (getIndustry?.() || 'general').toLowerCase();
  const config   = getPipelineConfig(industry);

  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeLead, setActiveLead] = useState(null);

  // Filters/UI
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);

  const [stageFilter, setStageFilter] = useState('all'); // show all stages or a specific stage
  const [sortBy, setSortBy] = useState('updated_desc');  // updated_desc | updated_asc | value_desc | value_asc
  const [pageByStage, setPageByStage] = useState({});    // { [stageKey]: number }

  const [selected, setSelected] = useState(() => new Set());
  const searchRef = useRef(null);

  // hotkeys
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); searchRef.current?.focus(); }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); toggleAllVisible(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // fetch leads
  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const token = localStorage.getItem('token');
        const res   = await fetchWithTimeout(`${API_BASE}/leads/crm-leads/`, {
          headers: { Authorization: `Bearer ${token}` },
        }, 15000);
        const txt = await res.text();
        if (!res.ok) throw new Error(`crm-leads ${res.status} ${txt.slice(0,200)}`);
        const json = txt ? JSON.parse(txt) : [];
        const rows = Array.isArray(json) ? json : (json.results || []);
        setAllLeads(rows);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // helpers
  const valueOf = (lead) => {
    if (!config.valueField) return 0;
    const v = lead?.[config.valueField];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const stageList = useMemo(() => config.stages, [config]);

  // Filter/search/sort, then bucket by stage
  const buckets = useMemo(() => {
    // narrow by stage
    let rows = allLeads;
    if (stageFilter !== 'all') rows = rows.filter(l => (l.status || '') === stageFilter);

    // search
    const needle = dq.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(l => {
        const fields = [
          'name', 'email', 'phone_number', 'message', 'source', 'address', 'city', 'state',
          // include industry specific fields if present
          ...config.displayedFields
        ];
        return fields.some(f => {
          const v = (l[f] ?? '').toString().toLowerCase();
          return v.includes(needle);
        });
      });
    }

    // sort
    rows.sort((a, b) => {
      if (sortBy === 'updated_asc')  return new Date(a.updated_at || 0) - new Date(b.updated_at || 0);
      if (sortBy === 'value_desc')   return valueOf(b) - valueOf(a);
      if (sortBy === 'value_asc')    return valueOf(a) - valueOf(b);
      // updated_desc default
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });

    // bucket by configured stages (keep empty buckets)
    const map = Object.fromEntries(stageList.map(s => [s.key, []]));
    rows.forEach(l => {
      const k = l.status || 'new';
      if (map[k]) map[k].push(l);
    });
    return map;
  }, [allLeads, dq, stageFilter, sortBy, stageList, config.displayedFields]);

  // selection (visible only)
  const visibleIds = useMemo(() => {
    const ids = [];
    (stageFilter === 'all' ? stageList.map(s => s.key) : [stageFilter]).forEach(k => {
      const page = pageByStage[k] || 1;
      const slice = (buckets[k] || []).slice(0, page * PAGE_SIZE);
      slice.forEach(l => ids.push(l.id));
    });
    return ids;
  }, [buckets, pageByStage, stageFilter, stageList]);

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));

  const toggleAllVisible = useCallback(() => {
    const next = new Set(selected);
    if (allVisibleSelected) visibleIds.forEach(id => next.delete(id));
    else visibleIds.forEach(id => next.add(id));
    setSelected(next);
  }, [selected, allVisibleSelected, visibleIds]);

  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const showMore = (stageKey) => {
    setPageByStage(p => ({ ...p, [stageKey]: (p[stageKey] || 1) + 1 }));
  };

  // Render helpers
  const renderChip = (label) => (
    <span className="pl-chip" key={label}>{label}</span>
  );

  const renderField = (lead, field) => {
    const val = lead?.[field];
    if (val == null || val === '') return null;

    switch (field) {
      case 'preferred_time':
        return renderChip(`Time: ${String(val)}`);
      case 'service':
        return renderChip(String(val));
      case 'vehicle':
        return renderChip(String(val));
      case 'address':
        return renderChip(lead.address || [lead.city, lead.state].filter(Boolean).join(', '));
      case 'beds':
      case 'baths':
        return renderChip(`${field === 'beds' ? 'Beds' : 'Baths'}: ${val}`);
      case 'arv':
        return renderChip(`ARV: $${Number(val).toLocaleString()}`);
      case 'estimate_total':
      case 'quoted_amount':
      case 'membership_value':
      case 'estimated_price':
        return renderChip(`Value: $${Number(val).toLocaleString()}`);
      case 'email':
        return renderChip(String(val));
      case 'phone_number':
        return renderChip(String(val));
      case 'source':
        return renderChip(`Source: ${String(val)}`);
      case 'notes':
      case 'message':
        return <span className="pl-note" key={field} title={String(val)}>{String(val)}</span>;
      default:
        return renderChip(`${field}: ${String(val)}`);
    }
  };

  if (!['wholesaler','real_estate','pest_control','fitness','auto','general'].includes(industry)) {
    // still render with general config, but you can gate it if desired
  }

  return (
    <div className="pipeline-page content-area">
      {/* Filters */}
      <FiltersBar
        left={
          <button className="filters-button" onClick={toggleAllVisible} title={allVisibleSelected ? 'Unselect all' : 'Select all (visible)'}>
            {allVisibleSelected ? '☑︎' : '☐'}
          </button>
        }
        center={
          <>
            <input
              ref={searchRef}
              className="filters-input"
              placeholder="Search (⌘/Ctrl+F) name, email, phone, address, notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="filters-select" value={stageFilter} onChange={(e)=>setStageFilter(e.target.value)}>
              <option value="all">All stages</option>
              {stageList.map(s => <option value={s.key} key={s.key}>{s.label}</option>)}
            </select>
          </>
        }
        right={
          <>
            <select className="filters-select" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              <option value="updated_desc">Updated: Newest</option>
              <option value="updated_asc">Updated: Oldest</option>
              <option value="value_desc">Value: High → Low</option>
              <option value="value_asc">Value: Low → High</option>
            </select>
          </>
        }
      />

      <div className="pipeline container">
        <div className="pipeline-header">
          <h1>{industry === 'pest_control' ? 'Service Pipeline' :
                industry === 'fitness' ? 'Membership Pipeline' :
                industry === 'auto' ? 'Shop Pipeline' :
                'Deals Pipeline'}</h1>
          <div className="pipeline-ai-top">
            <Assistant context="pipeline" tianLeads={allLeads} />
          </div>
        </div>

        {loading && <p className="pl-loading">Loading…</p>}
        {error && <p className="pl-error">{error}</p>}

        {!loading && !error && (
          <div className="pipeline-vertical">
            {(stageFilter === 'all' ? stageList : stageList.filter(s => s.key === stageFilter)).map(stage => {
              const data = buckets[stage.key] || [];
              const page = pageByStage[stage.key] || 1;
              const slice = data.slice(0, page * PAGE_SIZE);
              const canMore = data.length > slice.length;

              return (
                <section className="pl-stage" key={stage.key} aria-labelledby={`pl-${stage.key}-title`}>
                  <header className="pl-stage-header">
                    <h3 id={`pl-${stage.key}-title`}>{stage.label}</h3>
                    <span className="count">{data.length}</span>
                  </header>

                  {slice.length === 0 ? (
                    <p className="pl-empty">{config.emptyCopy}</p>
                  ) : (
                    <div className="pl-row" role="list">
                      {slice.map(lead => (
                        <article
                          key={lead.id}
                          className={`pl-card ${selected.has(lead.id) ? 'selected' : ''}`}
                          role="listitem"
                          onClick={() => setActiveLead(lead)}
                        >
                          <div className="pl-card-top">
                            <label className="pl-check">
                              <input
                                type="checkbox"
                                checked={selected.has(lead.id)}
                                onClick={(e)=>e.stopPropagation()}
                                onChange={(e)=>{ e.stopPropagation(); toggleOne(lead.id); }}
                                aria-label={`Select ${lead.name || 'lead'}`}
                              />
                            </label>
                            <strong className="pl-name">{lead.name || 'Unnamed'}</strong>
                            {config.valueField && (
                              <span className="pl-value">${valueOf(lead).toLocaleString()}</span>
                            )}
                          </div>

                          <div className="pl-card-meta">
                            <span className="pl-updated" title={lead.updated_at || lead.created_at}>
                              Updated: {lead.updated_at ? String(lead.updated_at).slice(0,10) :
                                       lead.created_at ? String(lead.created_at).slice(0,10) : '—'}
                            </span>
                          </div>

                          <div className="pl-chips">
                            {config.displayedFields.map(f => renderField(lead, f))}
                          </div>

                          {lead.message && <div className="pl-msg" title={lead.message}>{lead.message}</div>}
                        </article>
                      ))}
                    </div>
                  )}

                  {canMore && (
                    <div className="pl-more">
                      <button className="filters-button" onClick={() => showMore(stage.key)}>Show more</button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {activeLead && (
        <CustomerPopup
          lead={activeLead}
          leadType="pipeline"
          onClose={() => setActiveLead(null)}
        />
      )}
    </div>
  );
}