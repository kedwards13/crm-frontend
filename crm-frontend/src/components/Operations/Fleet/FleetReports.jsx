// src/components/Operations/Fleet/FleetReports.jsx
import React, { useEffect, useMemo, useState } from 'react';
import useFleetApi from './useFleetApi';
import { daysUntil, csvFromRows, sumBy, fmtCurrency } from './reportUtils';
import './FleetReports.css';

const todayISO = () => new Date().toISOString().slice(0,10);

export default function FleetReports(){
  const { listVehicles, listMaintenance } = useFleetApi();
  const [vehicles, setVehicles] = useState([]);
  const [maint, setMaint] = useState([]); // flat tasks for all vehicles (lazy-loaded)
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10));
  const [to, setTo] = useState(todayISO());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try{
        const data = await listVehicles();
        const rows = Array.isArray(data) ? data : (data.results || []);
        setVehicles(rows);

        // fetch maintenance for each (small fleets are fine; for large, back your API with a bulk endpoint)
        const tasks = [];
        for (const v of rows){
          try{
            const t = await listMaintenance(v.id);
            const arr = Array.isArray(t) ? t : (t.results || []);
            tasks.push(...arr.map(x => ({ ...x, _vehicle: v })));
          }catch {}
        }
        setMaint(tasks);
      } finally { setLoading(false); }
    })();
  }, [listVehicles, listMaintenance]);

  // Filtered vehicles
  const vFiltered = useMemo(() => vehicles.filter(v => {
    if (status !== 'all' && v.status !== status) return false;
    if (type !== 'all' && (v.type || 'other') !== type) return false;
    if (q){
      const blob = `${v.unit_code} ${v.make} ${v.model} ${v.vin} ${v.plate} ${v.assigned_to_name}`.toLowerCase();
      if (!blob.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [vehicles, q, status, type]);

  // Tabs: maintenance log / costs / utilization / compliance
  const [tab, setTab] = useState('maintenance');

  // 2.1 Maintenance Log
  const maintFiltered = useMemo(() => {
    const inRange = (d) => {
      if (!d) return true;
      const t = new Date(d).getTime();
      return (!from || t >= new Date(from).getTime()) && (!to || t <= new Date(to).getTime());
    };
    return maint
      .filter(m => vFiltered.some(v => v.id === m.vehicle_id))
      .filter(m => inRange(m.created_at) || inRange(m.completed_at) || inRange(m.due_date))
      .sort((a,b) => new Date(b.created_at || b.due_date || 0) - new Date(a.created_at || a.due_date || 0));
  }, [maint, vFiltered, from, to]);

  // 2.2 Cost Report (sum by vehicle)
  const costByVehicle = useMemo(() => {
    const map = new Map();
    for (const m of maintFiltered){
      if (m.cost && m.status === 'done'){
        const key = m.vehicle_id;
        map.set(key, (map.get(key) || 0) + (Number(m.cost) || 0));
      }
    }
    return [...map.entries()].map(([vehicle_id, total]) => {
      const v = vehicles.find(x => x.id === vehicle_id);
      return { vehicle_id, unit_code: v?.unit_code || '—', make: v?.make, model: v?.model, total };
    }).sort((a,b) => b.total - a.total);
  }, [maintFiltered, vehicles]);

  // 2.3 Utilization (odometer deltas – needs prior snapshots, we’ll show simple current vs. last_service_miles)
  const utilization = useMemo(() => vFiltered.map(v => ({
    vehicle_id: v.id,
    unit_code: v.unit_code,
    miles_since_service: Math.max(0, (v.odometer ?? 0) - (v.last_service_miles ?? 0)),
    next_due_miles: v.next_service_due_miles ?? null,
  })).sort((a,b) => b.miles_since_service - a.miles_since_service), [vFiltered]);

  // 2.4 Compliance (insurance/registration/service)
  const compliance = useMemo(() => vFiltered.map(v => {
    const insDays = daysUntil(v?.insurance?.expires_on);
    const regDays = daysUntil(v?.registration_expires_on);
    const svcDays = daysUntil(v?.next_service_due_date);
    const svcMilesDelta = (v.next_service_due_miles ?? Infinity) - (v.odometer ?? 0);
    return {
      vehicle_id: v.id,
      unit_code: v.unit_code,
      insurance: insDays,
      registration: regDays,
      service_days: svcDays,
      service_miles_left: isFinite(svcMilesDelta) ? svcMilesDelta : null
    };
  }), [vFiltered]);

  // CSV export helper for any table
  const exportCsv = (rows, name) => {
    const csv = csvFromRows(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>Fleet Reports</h1>
        <div className="filters">
          <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="in_service">In Service</option>
            <option value="retired">Retired</option>
          </select>
          <select value={type} onChange={e=>setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="truck">truck</option>
            <option value="van">van</option>
            <option value="car">car</option>
            <option value="sprayer">sprayer</option>
            <option value="trailer">trailer</option>
            <option value="other">other</option>
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
      </header>

      <nav className="tabs">
        {['maintenance','costs','utilization','compliance'].map(k => (
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>
            {k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
      </nav>

      {loading ? <div className="fleet-skel">Loading…</div> : (
        <>
          {tab==='maintenance' && (
            <section className="panel">
              <div className="panel-head">
                <h3>Maintenance Log</h3>
                <button className="mini" onClick={()=>exportCsv(maintFiltered, 'maintenance')}>Export CSV</button>
              </div>
              <div className="table">
                <div className="thead">
                  <div>Unit</div><div>Title</div><div>Type</div><div>Status</div><div>Due</div><div>Due Miles</div><div>Completed</div><div>Cost</div><div>Vendor</div>
                </div>
                <div className="tbody">
                  {maintFiltered.map(m => (
                    <div key={m.id} className="row">
                      <div className="mono">{m._vehicle?.unit_code || '—'}</div>
                      <div>{m.title}</div>
                      <div className="cap">{m.type}</div>
                      <div className="cap">{m.status}</div>
                      <div>{m.due_date || '—'}</div>
                      <div>{m.due_miles?.toLocaleString?.() || '—'}</div>
                      <div>{m.completed_at ? m.completed_at.slice(0,10) : '—'}</div>
                      <div>{m.cost != null ? fmtCurrency(Number(m.cost)) : '—'}</div>
                      <div>{m.vendor || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab==='costs' && (
            <section className="panel">
              <div className="panel-head">
                <h3>Cost Report</h3>
                <button className="mini" onClick={()=>exportCsv(costByVehicle, 'costs')}>Export CSV</button>
              </div>
              <div className="table">
                <div className="thead">
                  <div>Unit</div><div>Make</div><div>Model</div><div>Total Cost</div>
                </div>
                <div className="tbody">
                  {costByVehicle.map(r => (
                    <div key={r.vehicle_id} className="row">
                      <div className="mono">{r.unit_code}</div>
                      <div>{r.make || '—'}</div>
                      <div>{r.model || '—'}</div>
                      <div>{fmtCurrency(r.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab==='utilization' && (
            <section className="panel">
              <div className="panel-head">
                <h3>Utilization</h3>
                <button className="mini" onClick={()=>exportCsv(utilization, 'utilization')}>Export CSV</button>
              </div>
              <div className="table">
                <div className="thead">
                  <div>Unit</div><div>Miles Since Service</div><div>Next Due (mi)</div>
                </div>
                <div className="tbody">
                  {utilization.map(u => (
                    <div key={u.vehicle_id} className="row">
                      <div className="mono">{u.unit_code || '—'}</div>
                      <div>{u.miles_since_service.toLocaleString()}</div>
                      <div>{u.next_due_miles?.toLocaleString?.() || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab==='compliance' && (
            <section className="panel">
              <div className="panel-head">
                <h3>Compliance</h3>
                <button className="mini" onClick={()=>exportCsv(compliance, 'compliance')}>Export CSV</button>
              </div>
              <div className="table">
                <div className="thead">
                  <div>Unit</div><div>Insurance (days)</div><div>Registration (days)</div><div>Service (days)</div><div>Service (mi left)</div>
                </div>
                <div className="tbody">
                  {compliance.map(c => (
                    <div key={c.vehicle_id} className="row">
                      <div className="mono">{c.unit_code || '—'}</div>
                      <div className={toneClass(c.insurance)}>{fmtDays(c.insurance)}</div>
                      <div className={toneClass(c.registration)}>{fmtDays(c.registration)}</div>
                      <div className={toneClass(c.service_days)}>{fmtDays(c.service_days)}</div>
                      <div className={toneClass(c.service_miles_left)}>{c.service_miles_left ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function toneClass(val){
  if (val == null) return '';
  if (typeof val === 'number'){
    if (val < 0) return 'bad';
    if (val <= 30) return 'warn';
  }
  return 'good';
}
function fmtDays(d){
  if (d == null) return '—';
  return d < 0 ? `${Math.abs(d)} past` : `${d} days`;
}