import React, { useEffect, useMemo, useState } from "react";
import { getRouteLoad } from "../../../api/analyticsApi";
import WidgetPanel from "../../ui/WidgetPanel";
import KeyValueGrid from "../../ui/KeyValueGrid";
import "./AnalyticsShared.css";

const safePct = (ratio) => {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
};

export default function AnalyticsRouteLoad() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getRouteLoad({ days: 14 });
        if (!mounted) return;
        setPayload(res?.data || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Route load unavailable.");
        setPayload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    const list = Array.isArray(payload?.rows) ? payload.rows : [];
    return list.slice(0, 50).map((r) => ({
      route_id: r.route_id,
      route_date: r.route_date,
      technician_name: r.technician_name || "Unassigned",
      scheduled_jobs: Number(r.scheduled_jobs || 0),
      capacity_slots: Number(r.capacity_slots || 0),
      load_rate: Number(r.load_rate || 0),
      average_distance: Number(r.average_distance || 0),
      distance_score: Number(r.distance_score || 0),
      title: r.title || r.group_title || "",
    }));
  }, [payload]);

  const supported = payload?.supported !== false;

  return (
    <div className="analytics-page-shell">
      <header className="analytics-page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Route Load</h1>
          <span>Shows route capacity pressure. Uses FieldRoutes routes when available.</span>
        </div>
      </header>

      {!supported ? (
        <div className="analytics-warn">Route analytics not enabled for this tenant yet.</div>
      ) : null}
      {error ? <div className="analytics-warn">{error}</div> : null}

      <WidgetPanel title="Routes" subtitle={payload?.date_from ? `${payload.date_from} → ${payload.date_to}` : "Last 14 days"}>
        {loading ? (
          <div className="analytics-empty">Loading…</div>
        ) : !rows.length ? (
          <div className="analytics-empty">No routes found.</div>
        ) : (
          <div className="analytics-table">
            <div className="analytics-table-head">
              <span>Date</span>
              <span>Tech</span>
              <span>Jobs</span>
              <span>Cap</span>
              <span>Load</span>
              <span>Score</span>
            </div>
            {rows.map((r) => (
              <div key={`${r.route_id}-${r.route_date}`} className="analytics-table-row">
                <strong>{r.route_date || "—"}</strong>
                <span title={r.technician_name}>{r.technician_name}</span>
                <span>{r.scheduled_jobs}</span>
                <span>{r.capacity_slots}</span>
                <span>{safePct(r.load_rate)}</span>
                <span>{r.distance_score || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </WidgetPanel>

      <KeyValueGrid title="Raw Payload" data={payload || {}} />
    </div>
  );
}

