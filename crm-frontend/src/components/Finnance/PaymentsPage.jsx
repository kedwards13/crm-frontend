import React, { useEffect, useMemo, useState } from "react";
import "./FinancePage.css";
import { listPayments } from "../../api/paymentsApi";
import SearchInput from "../ui/SearchInput";
import StatusPill from "../ui/StatusPill";
import KeyValueGrid from "../ui/KeyValueGrid";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const money = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const clean = (value) => String(value || "").trim();

const statusKey = (value) => clean(value).toLowerCase();

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await listPayments({ page_size: 200 });
        if (!mounted) return;
        setPayments(toRows(res?.data));
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Unable to load payments.");
        setPayments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = Array.isArray(payments) ? payments : [];
    if (!q) return rows;
    return rows.filter((p) => {
      const hay = [
        p.external_id,
        p.invoice_id,
        p.customer_external_id,
        p.payment_method,
        p.status,
        p.date,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [payments, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const days30 = 30 * 24 * 60 * 60 * 1000;
    let processed = 0;
    let pending = 0;
    let failed = 0;
    filtered.forEach((p) => {
      const dt = new Date(p.date || 0);
      const in30 = !Number.isNaN(dt.getTime()) ? now.getTime() - dt.getTime() <= days30 : true;
      if (!in30) return;
      const amount = Number(p.amount || 0);
      const s = statusKey(p.status);
      if (s.includes("fail")) failed += amount;
      else if (s.includes("pend")) pending += amount;
      else processed += amount;
    });
    return { processed, pending, failed };
  }, [filtered]);

  return (
    <div className="finance-page">
      <header className="finance-head">
        <div>
          <h2>Payments</h2>
          <p className="finance-muted">Monitor payment activity, refunds, and processing status.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-btn secondary" disabled title="Refund workflow not yet wired">
            Refund
          </button>
          <button className="finance-btn" disabled title="Manual payment entry not yet wired">
            Record Payment
          </button>
        </div>
      </header>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by invoice, customer, method, status…"
          />
        </div>
        <button
          className="finance-btn secondary"
          type="button"
          onClick={() => {
            setQuery("");
            setSelected(null);
          }}
        >
          Clear
        </button>
      </div>

      <section className="finance-stat-grid">
        <div className="finance-stat">
          <div className="label">Processed (30d)</div>
          <div className="value">{money(stats.processed)}</div>
        </div>
        <div className="finance-stat">
          <div className="label">Pending</div>
          <div className="value">{money(stats.pending)}</div>
        </div>
        <div className="finance-stat">
          <div className="label">Failed</div>
          <div className="value">{money(stats.failed)}</div>
        </div>
        <div className="finance-stat">
          <div className="label">Refunds</div>
          <div className="value">—</div>
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <h3>Recent Payments</h3>
          <button className="finance-btn secondary" disabled>
            Export
          </button>
        </div>
        {loading ? <div className="finance-muted" style={{ padding: 14 }}>Loading…</div> : null}
        {error ? <div className="finance-muted" style={{ padding: 14, color: "var(--danger)" }}>{error}</div> : null}
        <div className="finance-table" style={{ "--finance-columns": "1.1fr 1.2fr 0.8fr 0.8fr 0.9fr" }}>
          <div className="finance-row head">
            <div>Payment</div>
            <div>Invoice</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {filtered.map((payment) => (
            <div
              key={payment.external_id || `${payment.invoice_id}-${payment.date}`}
              className="finance-row"
              role="button"
              tabIndex={0}
              onClick={() => setSelected(payment)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelected(payment);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="mono">{clean(payment.external_id) || "—"}</div>
              <div className="mono">{clean(payment.invoice_id) || "—"}</div>
              <div>{money(payment.amount)}</div>
              <div>
                <StatusPill status={payment.status} />
              </div>
              <div>{clean(payment.date) || "—"}</div>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="finance-card">
          <div className="finance-card-head">
            <h3>Payment Details</h3>
            <button className="finance-btn secondary" type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <KeyValueGrid title={null} data={selected} />
        </section>
      ) : null}
    </div>
  );
}
