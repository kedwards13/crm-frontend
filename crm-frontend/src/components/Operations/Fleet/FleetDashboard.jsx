// src/components/Operations/Fleet/FleetDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import useFleetApi from './useFleetApi';
import { daysUntil, sumBy, groupBy } from './reportUtils';
import './FleetReports.css';

export default function FleetDashboard(){
  const { listVehicles } = useFleetApi();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try{
        const data = await listVehicles();
        setRows(Array.isArray(data) ? data : (data.results || []));
      } finally{ setLoading(false); }
    })();
  }, [listVehicles]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const active = rows.filter(v => v.status === 'active').length;
    const inSvc  = rows.filter(v => v.status === 'in_service').length;

    const overdueMaint = rows.filter(v => {
      const milesPast = (v.odometer ?? 0) - (v.next_service_due_miles ?? Infinity);
      const datePast  = daysUntil(v.next_service_due_date) ?? Infinity;
      return milesPast >= 0 || datePast < 0;
    }).length;

    const expiringInsurance = rows.filter(v => {
      const d = daysUntil(v?.insurance?.expires_on);
      return d != null && d <= 30;
    }).length;

    return [
      { key:'total',   label:'Total Units',          value: total },
      { key:'active',  label:'Active',               value: active },
      { key:'insvc',   label:'In Service',           value: inSvc },
      { key:'overdue', label:'Overdue Maintenance',  value: overdueMaint },
      { key:'expins',  label:'Insurance ≤ 30d',      value: expiringInsurance },
    ];
  }, [rows]);

  const byType = useMemo(() => {
    const g = groupBy(rows, v => v.type || 'other');
    return Object.entries(g).map(([type, list]) => ({ type, count: list.length }));
  }, [rows]);

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>Fleet Overview</h1>
      </header>

      {loading ? <div className="fleet-skel">Loading…</div> : (
        <>
          <section className="kpi-grid">
            {kpis.map(k => (
              <div key={k.key} className="kpi">
                <div className="kpi-value">{k.value.toLocaleString()}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Composition by Type</h3>
            </div>
            <div className="bars">
              {byType.length === 0 && <p className="muted">No vehicles.</p>}
              {byType.map(r => (
                <div key={r.type} className="bar-row">
                  <span className="bar-label">{r.type}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(r.count / Math.max(1, rows.length))*100}%` }} />
                  </div>
                  <span className="bar-value">{r.count}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}