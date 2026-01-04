import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchCallLogs } from "../../../api/communications";
import "./PhoneDialer.css";

const FILTER_OPTIONS = [
  { value: "party_universal_id", label: "Party ID" },
  { value: "customer_id", label: "Customer ID" },
  { value: "lead_id", label: "Lead ID" },
  { value: "phone", label: "Phone" },
];

const STATUS_LABELS = {
  completed: "Completed",
  "no-answer": "No Answer",
  failed: "Failed",
  busy: "Busy",
  ringing: "Ringing",
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

  const loadCalls = async (params) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCallLogs(params);
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.calls)
        ? data.calls
        : [];
      setCallLog(rows);
    } catch (err) {
      setError(err?.message || "Unable to load calls.");
      setCallLog([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const next = getInitialLookup(location.search);
    setLookup(next);
    if (next.value) loadCalls({ [next.type]: next.value });
  }, [location.search]);

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
    loadCalls({ [lookup.type]: lookup.value.trim() });
  };

  return (
    <div className="phone-dialer-container">
      <div className="dialer-card">
        <h2 className="dialer-title">Calls</h2>
        <p className="dialer-subtitle">
          Look up call logs by party ID, customer, lead, or phone number.
        </p>

        <form className="dialer-input" onSubmit={handleLookupSubmit}>
          <select
            className="phone-input call-filter"
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
            className="phone-input"
          />

          <button className="action-button" type="submit" disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="phone-stats-row">
        <div className="phone-stat-block">
          <div className="stat-count count-new">{stats.total}</div>
          <div className="stat-label">Total Calls</div>
        </div>
        <div className="phone-stat-block">
          <div className="stat-count count-qualified">{stats.inbound}</div>
          <div className="stat-label">Inbound</div>
        </div>
        <div className="phone-stat-block">
          <div className="stat-count count-proposed">{stats.outbound}</div>
          <div className="stat-label">Outbound</div>
        </div>
        <div className="phone-stat-block">
          <div className="stat-count count-proposed">{stats.missed}</div>
          <div className="stat-label">Missed/Failed</div>
        </div>
        <div className="phone-stat-block">
          <div className="stat-count count-qualified">{stats.avgSeconds}s</div>
          <div className="stat-label">Avg Duration</div>
        </div>
      </div>

      <div className="call-log">
        <h3 className="call-log-title">Call Log</h3>
        {loading ? (
          <p className="no-records">Loading calls…</p>
        ) : callLog.length === 0 ? (
          <p className="no-records">
            {lookup.value ? "No calls found for this lookup." : "Enter a lookup to pull call logs."}
          </p>
        ) : (
          <ul className="call-log-list">
            {callLog.map((record, idx) => (
              <li key={record.id || record.created_at || `${record.from_number}-${idx}`} className="call-record">
                <div className="record-details">
                  <span className="record-number">
                    {record.from_number || "Unknown"} → {record.to_number || "Unknown"}
                  </span>
                  <span className="record-time">
                    {record.created_at
                      ? new Date(record.created_at).toLocaleString()
                      : "Unknown time"}
                  </span>
                </div>
                <div className="record-status">
                  {record.direction?.toUpperCase() || "CALL"} •{" "}
                  {STATUS_LABELS[record.status] || record.status || "Unknown"} •{" "}
                  {record.duration_seconds || 0}s
                </div>
                <div className="record-actions">
                  <button className="call-back-btn" type="button">
                    Call Back
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
