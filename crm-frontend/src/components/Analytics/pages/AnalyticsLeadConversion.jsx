import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { getLeadPerformance } from "../../../api/analyticsApi";
import WidgetPanel from "../../ui/WidgetPanel";
import KeyValueGrid from "../../ui/KeyValueGrid";
import "./AnalyticsShared.css";

const safePct = (ratio) => {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
};

const toMoney = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export default function AnalyticsLeadConversion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getLeadPerformance({ days: 180 });
        if (!mounted) return;
        setPayload(res?.data || null);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.detail ||
            e?.message ||
            "Lead conversion analytics unavailable (often due to an incomplete schema during backfill)."
        );
        setPayload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const reps = useMemo(() => {
    const rows = Array.isArray(payload?.sales_rep_close_rate) ? payload.sales_rep_close_rate : [];
    return rows.slice(0, 12).map((r) => ({
      name: r.name || r.sales_rep_id,
      close: Number(r.close_rate || 0) * 100,
      revenue: Number(r.revenue || 0),
      won: Number(r.won || 0),
      total: Number(r.total || 0),
    }));
  }, [payload]);

  const sources = useMemo(() => {
    const rows = Array.isArray(payload?.revenue_per_lead_source) ? payload.revenue_per_lead_source : [];
    return rows.slice(0, 12).map((r) => ({
      source: r.lead_source,
      revenue: Number(r.revenue || 0),
      leads: Number(r.leads || 0),
      converted: Number(r.converted || 0),
    }));
  }, [payload]);

  return (
    <div className="analytics-page-shell">
      <header className="analytics-page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Lead Conversion</h1>
          <span>Lead-to-customer conversion based on FieldRoutes-linked service plans (when available).</span>
        </div>
      </header>

      {error ? <div className="analytics-warn">{error}</div> : null}

      <div className="analytics-two-col">
        <WidgetPanel title="Conversion Rate" subtitle={payload?.date_from ? `${payload.date_from} → ${payload.date_to}` : "Window"}>
          {loading ? (
            <div className="analytics-empty">Loading…</div>
          ) : payload ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Lead conversion rate</span>
                <strong>{safePct(payload.lead_conversion_rate)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Avg days to close</span>
                <strong>{payload.average_days_to_close ?? "—"}</strong>
              </div>
              <div style={{ marginTop: 6, color: "var(--text-sub)" }}>
                If this panel is empty, the import is still linking FieldRoutes service plans to leads.
              </div>
            </div>
          ) : (
            <div className="analytics-empty">No lead conversion payload yet.</div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Top Sales Reps" subtitle="Close rate (won/total)">
          {loading ? (
            <div className="analytics-empty">Loading…</div>
          ) : reps.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reps}>
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
                  formatter={(v, k) => (k === "close" ? `${Number(v).toFixed(1)}%` : v)}
                />
                <Bar dataKey="close" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-empty">No rep conversion data yet.</div>
          )}
        </WidgetPanel>
      </div>

      <WidgetPanel title="Lead Sources" subtitle="Revenue by source">
        {!sources.length ? (
          <div className="analytics-empty">No data.</div>
        ) : (
          <div className="analytics-table">
            <div className="analytics-table-head">
              <span>Source</span>
              <span>Leads</span>
              <span>Converted</span>
              <span>Revenue</span>
              <span />
              <span />
            </div>
            {sources.map((s) => (
              <div key={s.source} className="analytics-table-row">
                <strong title={s.source}>{s.source}</strong>
                <span>{s.leads}</span>
                <span>{s.converted}</span>
                <span>{toMoney(s.revenue)}</span>
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

