import React, { useCallback, useEffect, useState } from "react";
import StatusPill from "../../ui/StatusPill";
import { listOperationalCustomerPayments } from "../../../api/operationsCustomersApi";
import "../CustomerDetailPage.css";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
};

const money = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

export default function OperationalPaymentsTab({ fieldroutesCustomerId }) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = useCallback(
    async ({ targetPage, append }) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const { data } = await listOperationalCustomerPayments(fieldroutesCustomerId, {
          page: targetPage,
          page_size: 50,
        });
        const nextRows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setTotalCount(Number(data?.count || 0) || nextRows.length);
        setHasNext(Boolean(data?.next));
        setPage(targetPage);
        setRows((prev) => (append ? prev.concat(nextRows) : nextRows));
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || "Unable to load payments.");
        if (!append) setRows([]);
        setHasNext(false);
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [fieldroutesCustomerId]
  );

  useEffect(() => {
    void fetchPage({ targetPage: 1, append: false });
  }, [fetchPage]);

  if (loading) return <div className="cdp-empty">Loading payments…</div>;
  if (error) return <div className="cdp-empty">{error}</div>;

  return (
    <div className="cdp-stack">
      {!rows.length ? (
        <div className="cdp-empty">No payments found.</div>
      ) : (
        <div className="cdp-table-scroll">
          <table className="cdp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Invoice</th>
                <th>Balance Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.external_id}>
                  <td>{formatDate(p.date)}</td>
                  <td>{money(p.amount)}</td>
                  <td>{p.payment_method || "—"}</td>
                  <td>
                    <StatusPill status={p.payment_status || p.status || "paid"} />
                  </td>
                  <td>{p.invoice_id || "—"}</td>
                  <td>{money(p.balance_remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cdp-footer">
        <div>
          Showing <strong>{rows.length}</strong> of <strong>{totalCount || rows.length}</strong>
        </div>
        <button
          type="button"
          className="cdp-btn primary"
          onClick={() => fetchPage({ targetPage: page + 1, append: true })}
          disabled={!hasNext || loadingMore}
        >
          {loadingMore ? "Loading…" : hasNext ? "Load More" : "End"}
        </button>
      </div>
    </div>
  );
}
