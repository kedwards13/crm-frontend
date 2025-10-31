import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useFleetApi from './useFleetApi';
import './FleetReports.css';

export default function VehiclesPage() {
  const { listVehicles, deleteVehicle } = useFleetApi();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listVehicles();
      setRows(Array.isArray(data) ? data : (data.results || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = useMemo(() => rows.filter(v => {
    if (status !== 'all' && v.status !== status) return false;
    if (type !== 'all' && (v.type || 'other') !== type) return false;
    if (q) {
      const blob = `${v.unit_code} ${v.make} ${v.model} ${v.year} ${v.vin} ${v.plate}`.toLowerCase();
      if (!blob.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, q, status, type]);

  const onDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    await deleteVehicle(id);
    await load();
  };

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>Vehicles</h1>
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
          <button className="mini" onClick={() => navigate('new')}>+ New Vehicle</button>
        </div>
      </header>

      {loading ? <div className="fleet-skel">Loading…</div> : (
        <section className="panel">
          <div className="table">
            <div className="thead">
              <div>Unit</div><div>Make</div><div>Model</div><div>Year</div>
              <div>VIN</div><div>Plate</div><div>Status</div><div>Odometer</div><div></div>
            </div>
            <div className="tbody">
              {filtered.map(v => (
                <div key={v.id} className="row">
                  <div className="mono">{v.unit_code || '—'}</div>
                  <div>{v.make || '—'}</div>
                  <div>{v.model || '—'}</div>
                  <div>{v.year || '—'}</div>
                  <div className="mono">{v.vin || '—'}</div>
                  <div className="mono">{v.plate || '—'}</div>
                  <div className="cap">{v.status}</div>
                  <div>{v.odometer?.toLocaleString?.() || '—'}</div>
                  <div className="row-actions">
                    <Link to={`${v.id}`}>View</Link>
                    <Link to={`${v.id}/edit`}>Edit</Link>
                    <button className="link danger" onClick={() => onDelete(v.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="row"><div>No vehicles yet. Click “New Vehicle”.</div></div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}