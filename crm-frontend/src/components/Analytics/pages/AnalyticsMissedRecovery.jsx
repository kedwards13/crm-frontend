import React, { useEffect, useMemo, useState } from "react";
import { getMissedRecovery } from "../../../api/analyticsApi";
import WidgetPanel from "../../ui/WidgetPanel";
import KeyValueGrid from "../../ui/KeyValueGrid";
import StatusPill from "../../ui/StatusPill";
import "./AnalyticsShared.css";

export default function AnalyticsMissedRecovery() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getMissedRecovery();
        if (!mounted) return;
        setPayload(res?.data || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Recovery pipeline unavailable.");
        setPayload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(
    () => (Array.isArray(payload?.grouped_by_reason) ? payload.grouped_by_reason.slice(0, 10) : []),
    [payload]
  );
  const rows = useMemo(
    () => (Array.isArray(payload?.results) ? payload.results.slice(0, 50) : []),
    [payload]
  );

  return (
    <div className="analytics-page-shell">
      <header className="analytics-page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Missed Appointment Recovery</h1>
          <span>Recovery queue from cancellations, missed jobs, and reschedules.</span>
        </div>
      </header>

      {error ? <div className="analytics-warn">{error}</div> : null}

      <div className="analytics-two-col">
        <WidgetPanel
          title="Recovery Summary"
          subtitle={payload?.generated_at ? `Generated: ${new Date(payload.generated_at).toLocaleString()}` : "Summary"}
        >
          {loading ? (
            <div className="analytics-empty">Loading…</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Missed Appointments</span>
                <strong>{Number(payload?.missed_appointments || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Recovery Opportunities</span>
                <strong>{Number(payload?.recovery_opportunities || 0)}</strong>
              </div>
              <div style={{ marginTop: 6, color: "var(--text-sub)" }}>
                {grouped.length ? "Top reasons:" : "No reason breakdown yet."}
              </div>
              {grouped.map((g) => (
                <div key={g.cancellation_reason} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{g.cancellation_reason}</span>
                  <strong>{Number(g.count || 0)}</strong>
                </div>
              ))}
            </div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Suggested Actions" subtitle="Recommended reschedule windows">
          {loading ? (
            <div className="analytics-empty">Loading…</div>
          ) : !rows.length ? (
            <div className="analytics-empty">No recovery rows.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {rows.slice(0, 8).map((r) => (
                <div
                  key={r.appointment_id}
                  style={{
                    border: "1px solid var(--panel-border)",
                    borderRadius: 12,
                    padding: 10,
                    background: "rgba(148, 163, 184, 0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong title={r.customer_name}>{r.customer_name}</strong>
                    <StatusPill status={r.status} />
                  </div>
                  <div style={{ marginTop: 6, color: "var(--text-sub)", fontSize: 13 }}>
                    Reason: {r.cancellation_reason || "Unknown"}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    Suggested:{" "}
                    <span style={{ color: "var(--text-sub)" }}>
                      {r.suggested_reschedule_window ? JSON.stringify(r.suggested_reschedule_window) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetPanel>
      </div>

      <WidgetPanel title="Recovery Queue" subtitle="First 50 rows">
        {!rows.length ? (
          <div className="analytics-empty">No data.</div>
        ) : (
          <div className="analytics-table">
            <div className="analytics-table-head">
              <span>Customer</span>
              <span>Status</span>
              <span>Reason</span>
              <span />
              <span />
              <span />
            </div>
            {rows.map((r) => (
              <div key={r.appointment_id} className="analytics-table-row">
                <strong title={r.customer_name}>{r.customer_name}</strong>
                <span>
                  <StatusPill status={r.status} />
                </span>
                <span title={r.cancellation_reason}>{r.cancellation_reason || "unknown"}</span>
                <span />
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

