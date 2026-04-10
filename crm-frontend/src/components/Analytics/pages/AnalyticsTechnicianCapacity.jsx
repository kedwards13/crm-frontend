import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { getTechnicianCapacity } from "../../../api/analyticsApi";
import WidgetPanel from "../../ui/WidgetPanel";
import KeyValueGrid from "../../ui/KeyValueGrid";
import "./AnalyticsShared.css";

export default function AnalyticsTechnicianCapacity() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getTechnicianCapacity();
        if (!mounted) return;
        setPayload(res?.data || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Technician capacity unavailable.");
        setPayload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const chart = useMemo(() => {
    const rows = Array.isArray(payload?.technicians) ? payload.technicians : [];
    return rows.slice(0, 14).map((t) => ({
      name: t.technician_name,
      appts: Number(t.appointments_today || 0),
      remaining: Number(t.capacity_remaining || 0),
      util: Number(t.utilization_percent || 0),
    }));
  }, [payload]);

  return (
    <div className="analytics-page-shell">
      <header className="analytics-page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Technician Capacity</h1>
          <span>Daily utilization and remaining capacity by technician.</span>
        </div>
      </header>

      {error ? <div className="analytics-warn">{error}</div> : null}

      <div className="analytics-two-col">
        <WidgetPanel title="Appointments Today" subtitle={payload?.date ? `Date: ${payload.date}` : "Today"}>
          {loading ? (
            <div className="analytics-empty">Loading…</div>
          ) : chart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--text-sub)" hide />
                <YAxis stroke="var(--text-sub)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--panel-border)",
                    borderRadius: 10,
                    color: "var(--text-main)",
                  }}
                />
                <Bar dataKey="appts" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-empty">No technicians found.</div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Utilization %" subtitle={`Average: ${Math.round(Number(payload?.technician_utilization_avg || 0))}%`}>
          {loading ? (
            <div className="analytics-empty">Loading…</div>
          ) : chart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--text-sub)" hide />
                <YAxis stroke="var(--text-sub)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--panel-border)",
                    borderRadius: 10,
                    color: "var(--text-main)",
                  }}
                />
                <Bar dataKey="util" fill="var(--accent-secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-empty">No utilization data yet.</div>
          )}
        </WidgetPanel>
      </div>

      <WidgetPanel title="Technicians" subtitle="Sorted by utilization">
        {!chart.length ? (
          <div className="analytics-empty">No data.</div>
        ) : (
          <div className="analytics-table">
            <div className="analytics-table-head">
              <span>Technician</span>
              <span>Appts</span>
              <span>Remaining</span>
              <span>Util %</span>
              <span />
              <span />
            </div>
            {chart.map((row) => (
              <div key={row.name} className="analytics-table-row">
                <strong title={row.name}>{row.name}</strong>
                <span>{row.appts}</span>
                <span>{row.remaining}</span>
                <span>{row.util}%</span>
                <span />
                <span />
              </div>
            ))}
          </div>
        )}
      </WidgetPanel>

      <KeyValueGrid title="Raw Payload" data={payload || {}} />
    </div>
  );
}

