import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import {
  getAnalyticsOverview,
  getLeadPerformance,
  getMissedRecovery,
  getRevenueDaily,
  getRevenueSummary,
  getRouteLoad,
  getTechnicianCapacity,
} from "../../../api/analyticsApi";
import WidgetGrid from "../../ui/WidgetGrid";
import WidgetPanel from "../../ui/WidgetPanel";
import AnalyticsMetricCard from "../AnalyticsMetricCard";
import KeyValueGrid from "../../ui/KeyValueGrid";
import "./AnalyticsDashboard.css";

const toRows = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

const toMoney = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const safePct = (ratio) => {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
};

const ratioChange = (current, previous) => {
  const a = Number(current);
  const b = Number(previous);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return (a - b) / Math.abs(b);
};

function RouteLoadHeatmap({ rows = [] }) {
  const grid = useMemo(() => {
    // Build a 2-week heatmap: rows are weekdays, columns are ISO dates.
    const byDate = new Map();
    rows.forEach((row) => {
      const date = row?.route_date;
      if (!date) return;
      const prev = byDate.get(date) || [];
      prev.push(Number(row?.load_rate || 0));
      byDate.set(date, prev);
    });
    const dates = Array.from(byDate.keys()).sort();
    const last14 = dates.slice(-14);
    const weekdayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = weekdayLabel.map((label) => ({ label, cells: [] }));
    last14.forEach((iso) => {
      const d = new Date(`${iso}T00:00:00`);
      const weekday = Number.isNaN(d.getTime()) ? null : d.getDay();
      const values = byDate.get(iso) || [];
      const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      buckets.forEach((b, idx) => {
        const isRow = weekday === idx;
        b.cells.push({
          key: `${b.label}-${iso}`,
          date: iso,
          value: isRow ? avg : null,
        });
      });
    });
    return { buckets, dates: last14 };
  }, [rows]);

  if (!grid?.dates?.length) {
    return <div className="ad-empty">No route load data yet.</div>;
  }

  const max = Math.max(
    0,
    ...grid.buckets.flatMap((b) => b.cells.map((c) => (c.value == null ? 0 : c.value)))
  );

  const colorFor = (v) => {
    if (v == null) return "transparent";
    const ratio = max > 0 ? Math.min(1, Math.max(0, v / max)) : 0;
    // Accessible warm ramp.
    const a = 0.08 + ratio * 0.32;
    return `rgba(249, 115, 22, ${a})`; // orange
  };

  return (
    <div className="ad-heatmap">
      <div className="ad-heatmap-head">
        <span>Route Load (Avg)</span>
        <span className="muted">Last {grid.dates.length} days</span>
      </div>
      <div className="ad-heatmap-grid" role="grid" aria-label="Route load heatmap">
        <div className="ad-heatmap-row head">
          <div className="ad-heatmap-y" />
          {grid.dates.map((d) => (
            <div key={d} className="ad-heatmap-x">
              {d.slice(5)}
            </div>
          ))}
        </div>
        {grid.buckets.map((bucket) => (
          <div key={bucket.label} className="ad-heatmap-row" role="row">
            <div className="ad-heatmap-y">{bucket.label}</div>
            {bucket.cells.map((cell) => (
              <div
                key={cell.key}
                className="ad-heatmap-cell"
                title={cell.value == null ? "" : `${bucket.label} ${cell.date}: ${(cell.value * 100).toFixed(0)}%`}
                style={{ background: colorFor(cell.value) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [revenueDaily, setRevenueDaily] = useState([]);
  const [techCapacity, setTechCapacity] = useState(null);
  const [routeLoad, setRouteLoad] = useState(null);
  const [missedRecovery, setMissedRecovery] = useState(null);
  const [leadPerf, setLeadPerf] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrors({});
      try {
        const settled = await Promise.allSettled([
          getRevenueSummary(),
          getAnalyticsOverview(),
          getRevenueDaily({ days: 30 }),
          getTechnicianCapacity(),
          getRouteLoad({ days: 14 }),
          getMissedRecovery(),
          getLeadPerformance({ days: 180 }),
        ]);
        if (!mounted) return;

        const nextErrors = {};
        const pick = (idx) => {
          const item = settled[idx];
          if (item.status === "fulfilled") return item.value?.data;
          nextErrors[idx] = item.reason?.message || "Request failed";
          return null;
        };

        setRevenueSummary(pick(0));
        setOverview(pick(1));
        setRevenueDaily(toRows(pick(2)));
        setTechCapacity(pick(3));
        setRouteLoad(pick(4));
        setMissedRecovery(pick(5));
        setLeadPerf(pick(6));
        setErrors(nextErrors);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isRecurring = String(revenueSummary?.model || "") === "recurring";

  const revenueTrend = useMemo(() => {
    const rows = Array.isArray(revenueDaily) ? revenueDaily : [];
    if (!rows.length) return { chart: [], current7: 0, prev7: 0 };
    const chart = rows.map((r) => ({
      label: String(r.date || "").slice(5),
      revenue: Number(r.total_revenue || 0),
    }));
    const last14 = rows.slice(-14);
    const prev7 = last14.slice(0, 7).reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    const current7 = last14.slice(7).reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    return { chart, current7, prev7 };
  }, [revenueDaily]);

  const routeLoadTrend = useMemo(() => {
    const rows = Array.isArray(routeLoad?.rows) ? routeLoad.rows : [];
    if (!rows.length) return { avg: 0, prev: 0, trend: null };
    const byDate = new Map();
    rows.forEach((r) => {
      const d = r.route_date;
      if (!d) return;
      const v = Number(r.load_rate || 0);
      const arr = byDate.get(d) || [];
      arr.push(v);
      byDate.set(d, arr);
    });
    const dates = Array.from(byDate.keys()).sort();
    const last14 = dates.slice(-14);
    const avgFor = (dateList) => {
      const values = dateList.flatMap((d) => byDate.get(d) || []);
      return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    };
    const prev = avgFor(last14.slice(0, 7));
    const avg = avgFor(last14.slice(7));
    return { avg, prev, trend: ratioChange(avg, prev) };
  }, [routeLoad]);

  const techTrend = useMemo(() => {
    const avg = Number(techCapacity?.technician_utilization_avg ?? 0);
    return { avg, trend: null };
  }, [techCapacity]);

  const missedTrend = useMemo(() => {
    const missed = Number(missedRecovery?.missed_appointments ?? 0);
    return { missed, trend: null };
  }, [missedRecovery]);

  const leadTrend = useMemo(() => {
    const rate = Number(leadPerf?.lead_conversion_rate ?? 0);
    return { rate, trend: null };
  }, [leadPerf]);

  const topLeadSources = useMemo(() => {
    const rows = Array.isArray(leadPerf?.revenue_per_lead_source) ? leadPerf.revenue_per_lead_source : [];
    return rows.slice(0, 6).map((r) => ({
      source: r.lead_source,
      revenue: Number(r.revenue || 0),
      converted: Number(r.converted || 0),
      leads: Number(r.leads || 0),
    }));
  }, [leadPerf]);

  return (
    <div className="analytics-dashboard">
      <header className="ad-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Field Operations Dashboard</h1>
          <span>
            {isRecurring
              ? "Recurring tenants read revenue from service agreements, active MRR, and agreement health."
              : "One-time tenants read revenue from normalized quotes, collections, and close performance."}
          </span>
        </div>
      </header>

      {Object.keys(errors).length ? (
        <div className="ad-warn">
          Some analytics endpoints are unavailable right now (expected during FieldRoutes backfill). The dashboard is showing partial data.
        </div>
      ) : null}

      <WidgetGrid columns={3} className="ad-metric-grid">
        <AnalyticsMetricCard
          title={isRecurring ? "Active MRR" : "Booked Revenue"}
          subtitle={isRecurring ? "Active agreements only" : "Normalized quote value excluding drafts"}
          value={toMoney(isRecurring ? revenueSummary?.mrr : revenueSummary?.booked_revenue)}
          trend={null}
          periodLabel={isRecurring ? "current monthly run-rate" : "current booked pipeline"}
          loading={loading}
          onClick={() => navigate("/analytics/revenue")}
        />
        <AnalyticsMetricCard
          title="Lead Conversion"
          subtitle="Converted / leads (FieldRoutes-linked)"
          value={safePct(leadTrend.rate)}
          trend={leadTrend.trend}
          periodLabel="vs prior period"
          loading={loading}
          onClick={() => navigate("/analytics/lead-conversion")}
        />
        <AnalyticsMetricCard
          title={isRecurring ? "Remaining Revenue" : "Collected Revenue"}
          subtitle={isRecurring ? "Contract value still uncollected" : "Recognized cash from quotes"}
          value={toMoney(isRecurring ? revenueSummary?.remaining_revenue : revenueSummary?.collected_revenue)}
          trend={null}
          periodLabel={isRecurring ? "agreements + orphan quotes" : "recognized revenue"}
          loading={loading}
          tone="good"
          onClick={() => navigate("/analytics/revenue")}
        />
        <AnalyticsMetricCard
          title="Technician Capacity"
          subtitle="Average utilization today"
          value={`${Math.round(techTrend.avg || 0)}%`}
          trend={techTrend.trend}
          periodLabel="today"
          loading={loading}
          onClick={() => navigate("/analytics/technicians")}
        />
        <AnalyticsMetricCard
          title="Route Load"
          subtitle="Load rate (scheduled / capacity)"
          value={safePct(routeLoadTrend.avg)}
          trend={routeLoadTrend.trend}
          periodLabel="vs prior 7 days"
          loading={loading}
          onClick={() => navigate("/analytics/routes")}
        />
        <AnalyticsMetricCard
          title="Missed Recovery"
          subtitle="Missed/cancelled opportunities"
          value={String(missedTrend.missed || 0)}
          trend={missedTrend.trend}
          periodLabel="open recovery queue"
          loading={loading}
          tone={missedTrend.missed ? "bad" : "neutral"}
          onClick={() => navigate("/analytics/recovery")}
        />
        <AnalyticsMetricCard
          title="Customer Lifetime Value"
          subtitle={isRecurring ? "Churned and paused recurring revenue" : "One-time close performance"}
          value={isRecurring ? toMoney(revenueSummary?.churned_mrr) : safePct(revenueSummary?.conversion_rate)}
          trend={null}
          periodLabel={isRecurring ? `paused ${toMoney(revenueSummary?.paused_mrr)}` : "quote completion"}
          loading={loading}
          onClick={() => navigate("/analytics/revenue")}
        />
      </WidgetGrid>

      <div className="ad-grid">
        <WidgetPanel title="Revenue Trend (Daily)" subtitle="Total revenue from rollups">
          {revenueTrend.chart.length ? (
            <div className="ad-chart">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueTrend.chart}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="var(--text-sub)" />
                  <YAxis stroke="var(--text-sub)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--panel-border)",
                      borderRadius: 10,
                      color: "var(--text-main)",
                    }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="ad-empty">No revenue rollups yet (RevenueRecord can be 0 during import).</div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Technician Productivity" subtitle="Appointments scheduled today">
          {Array.isArray(techCapacity?.technicians) && techCapacity.technicians.length ? (
            <div className="ad-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={techCapacity.technicians.slice(0, 10).map((t) => ({
                    name: t.technician_name,
                    appts: Number(t.appointments_today || 0),
                    util: Number(t.utilization_percent || 0),
                  }))}
                >
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
            </div>
          ) : (
            <div className="ad-empty">No technician capacity data yet.</div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Route Load Heatmap" subtitle="Capacity intensity by day">
          <RouteLoadHeatmap rows={Array.isArray(routeLoad?.rows) ? routeLoad.rows : []} />
        </WidgetPanel>

        <WidgetPanel title="Top Lead Sources" subtitle="Revenue by lead source (when available)">
          {topLeadSources.length ? (
            <div className="ad-table">
              <div className="ad-table-head">
                <span>Source</span>
                <span>Leads</span>
                <span>Converted</span>
                <span>Revenue</span>
              </div>
              {topLeadSources.map((row) => (
                <div key={row.source} className="ad-table-row">
                  <strong title={row.source}>{row.source}</strong>
                  <span>{row.leads}</span>
                  <span>{row.converted}</span>
                  <span>{toMoney(row.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ad-empty">Lead performance data not available yet.</div>
          )}
        </WidgetPanel>
      </div>

      {/* Debug surface: keeps all backend fields visible without bloating primary UI */}
      <div className="ad-debug">
        <KeyValueGrid title="Overview Payload" data={overview || {}} />
      </div>
    </div>
  );
}
