import React, { useEffect, useState } from "react";
import revivalApi from "../../api/revivalApi";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const clean = (value) => String(value || "").trim();

const formatDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

const money = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : "—";
};

export default function RevivalHistory() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [summaryRes, recentRes] = await Promise.all([
        revivalApi.getSummary().then((res) => res.data || null).catch(() => null),
        revivalApi.getRecentScans({ limit: 25 }).then((res) => toRows(res.data)).catch(() => []),
      ]);

      if (!mounted) return;
      setSummary(summaryRes);
      setRecentScans(recentRes);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 20, display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Revival History Snapshot</h3>
        {loading ? (
          <div>Loading summary...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            <div>Total scanned: {Number(summary?.total_scanned || 0)}</div>
            <div>Scanned value: {money(summary?.total_scanned_value || 0)}</div>
            <div>Paid quotes: {Number(summary?.paid_quotes || 0)}</div>
            <div>Unpaid quotes: {Number(summary?.unpaid_quotes || 0)}</div>
          </div>
        )}
      </section>

      <section>
        <h4 style={{ margin: "0 0 10px 0" }}>Recent Revival Activity</h4>
        {loading ? <div>Loading history...</div> : null}
        {!loading && !recentScans.length ? <div>No recent scan activity found.</div> : null}
        {!loading &&
          recentScans.map((row) => (
            <div
              key={row.id || row.uuid || row.created_at}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <strong>{clean(row.customer_name) || clean(row.title) || "Revival record"}</strong>
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {formatDate(row.created_at || row.updated_at)}
                </span>
              </div>
              <div style={{ marginTop: 6, color: "#374151", fontSize: 13 }}>
                Status: {clean(row.status) || "draft"} • Total:{" "}
                {money(row.total || row.estimated_total || row.quote_total || 0)}
              </div>
            </div>
          ))}
      </section>
    </div>
  );
}
