import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchCallLogs } from "../../../api/communications";
import WebPhone from "./WebPhone";
import WrapUpModal from "./WrapUpModal";
import "./CallsPage.css";

const FILTER_OPTIONS = [
  { value: "party_universal_id", label: "Party ID" },
  { value: "customer_id", label: "Customer ID" },
  { value: "lead_id", label: "Lead ID" },
  { value: "phone", label: "Phone" },
];

const STATUS_LABELS = {
  initiated: "Initiated",
  ringing: "Ringing",
  in_progress: "In progress",
  answered: "Answered",
  completed: "Completed",
  "no-answer": "No Answer",
  failed: "Failed",
  busy: "Busy",
  idle: "Idle",
};

const normalizeCallId = (call = {}) =>
  call.call_sid || call.sid || call.id || `${call.from_number}-${call.to_number}-${call.created_at}`;

const mergeCallLists = (current = [], incoming = []) => {
  const map = new Map();
  incoming.forEach((call) => {
    const key = normalizeCallId(call);
    map.set(key, call);
  });
  current.forEach((call) => {
    const key = normalizeCallId(call);
    if (!map.has(key)) map.set(key, call);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
  );
};

function getInitialLookup(search) {
  const params = new URLSearchParams(search);
  if (params.get("party_universal_id")) {
    return { type: "party_universal_id", value: params.get("party_universal_id") };
  }
  if (params.get("customer_id")) {
    return { type: "customer_id", value: params.get("customer_id") };
  }
  if (params.get("lead_id")) {
    return { type: "lead_id", value: params.get("lead_id") };
  }
  if (params.get("phone")) {
    return { type: "phone", value: params.get("phone") };
  }
  return { type: "phone", value: "" };
}

export default function CallsPage() {
  const location = useLocation();
  const [lookup, setLookup] = useState(() => getInitialLookup(location.search));
  const [callLog, setCallLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wrapupTarget, setWrapupTarget] = useState(null);

  const loadCalls = useCallback(async (params, isInitial = false) => {
    if (isInitial) setLoading(true);
    setError("");
    try {
      const data = await fetchCallLogs(params);
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.calls)
        ? data.calls
        : [];
      setCallLog((prev) => mergeCallLists(prev, rows));
    } catch (err) {
      setError(err?.message || "Unable to load calls.");
      if (isInitial) setCallLog([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const next = getInitialLookup(location.search);
    setLookup(next);
  }, [location.search]);

  useEffect(() => {
    const params = lookup.value ? { [lookup.type]: lookup.value.trim() } : {};
    let cancelled = false;

    loadCalls(params, true);
    const timer = setInterval(() => {
      if (!cancelled) loadCalls(params, false);
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [loadCalls, lookup.type, lookup.value]);

  const stats = useMemo(() => {
    const total = callLog.length;
    const inbound = callLog.filter((c) => c.direction === "inbound").length;
    const outbound = callLog.filter((c) => c.direction === "outbound").length;
    const missed = callLog.filter((c) =>
      ["no-answer", "failed", "busy"].includes((c.status || "").toLowerCase())
    ).length;
    const totalSeconds = callLog.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
    const avgSeconds = total ? Math.round(totalSeconds / total) : 0;
    return { total, inbound, outbound, missed, avgSeconds };
  }, [callLog]);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!lookup.value.trim()) {
      setCallLog([]);
      return;
    }
    loadCalls({ [lookup.type]: lookup.value.trim() }, true);
  };

  const handleWrapSaved = () => {
    setWrapupTarget(null);
  };

  return (
    <div className="calls-page">
      <WebPhone />

      <div className="calls-grid">
        <div className="call-card">
          <div className="call-card__header">
            <div>
              <h3>Call lookup</h3>
            </div>
            {error && <div className="badge badge--error">{error}</div>}
          </div>
          <form className="call-filter" onSubmit={handleLookupSubmit}>
            <select
              value={lookup.type}
              onChange={(e) => setLookup((prev) => ({ ...prev, type: e.target.value }))}
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Enter lookup value"
              value={lookup.value}
              onChange={(e) => setLookup((prev) => ({ ...prev, value: e.target.value }))}
            />
            <button type="submit" className="webphone-btn primary" disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </button>
          </form>

          <div className="call-stats">
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div>
              <div className="stat-value">{stats.inbound}</div>
              <div className="stat-label">Inbound</div>
            </div>
            <div>
              <div className="stat-value">{stats.outbound}</div>
              <div className="stat-label">Outbound</div>
            </div>
            <div>
              <div className="stat-value">{stats.missed}</div>
              <div className="stat-label">Missed/Failed</div>
            </div>
            <div>
              <div className="stat-value">{stats.avgSeconds}s</div>
              <div className="stat-label">Avg duration</div>
            </div>
          </div>
        </div>

        <div className="call-card">
          <div className="call-card__header">
            <div>
              <h3>Live call feed</h3>
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading calls…</p>
          ) : callLog.length === 0 ? (
            <p className="muted">
              {lookup.value ? "No calls for this lookup yet." : "Waiting for call activity."}
            </p>
          ) : (
            <div className="call-list">
              {callLog.map((record) => {
                const status = STATUS_LABELS[record.status] || record.status || "Unknown";
                return (
                  <div key={normalizeCallId(record)} className="call-row">
                    <div>
                      <div className="call-row__title">
                        {record.from_number || "Unknown"} → {record.to_number || "Unknown"}
                      </div>
                      <div className="muted tiny">
                        {record.direction?.toUpperCase() || "CALL"} • {status} •{" "}
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString()
                          : "Unknown time"}
                      </div>
                    </div>
                    <div className="call-row__meta">
                      <span className="badge">{record.duration_seconds || 0}s</span>
                      <button
                        type="button"
                        className="webphone-btn ghost"
                        onClick={() => setWrapupTarget(record)}
                      >
                        Wrap up
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {wrapupTarget && (
        <WrapUpModal call={wrapupTarget} onClose={() => setWrapupTarget(null)} onSaved={handleWrapSaved} />
      )}
    </div>
  );
}
