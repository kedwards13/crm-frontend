import React, { useCallback, useEffect, useState } from "react";
import StatusPill from "../../ui/StatusPill";
import { listOperationalCustomerAppointments } from "../../../api/operationsCustomersApi";
import "../CustomerDetailPage.css";

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

export default function OperationalAppointmentsTab({ fieldroutesCustomerId }) {
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
        const { data } = await listOperationalCustomerAppointments(fieldroutesCustomerId, {
          page: targetPage,
          page_size: 50,
        });
        const nextRows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setTotalCount(Number(data?.count || 0) || nextRows.length);
        setHasNext(Boolean(data?.next));
        setPage(targetPage);
        setRows((prev) => (append ? prev.concat(nextRows) : nextRows));
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || "Unable to load appointments.");
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

  const now = Date.now();
  const upcoming = rows.filter((row) => new Date(row.scheduled_start || row.created_at || 0).getTime() >= now);
  const past = rows.filter((row) => new Date(row.scheduled_start || row.created_at || 0).getTime() < now);

  if (loading) return <div className="cdp-empty">Loading appointments…</div>;
  if (error) return <div className="cdp-empty">{error}</div>;

  return (
    <div className="cdp-stack">
      {[
        ["Upcoming", upcoming],
        ["Past", past],
      ].map(([label, groupRows]) => (
        <section key={label} className="cdp-group">
          <div className="cdp-group-head">
            <h4>{label}</h4>
            <span>{groupRows.length}</span>
          </div>
          {!groupRows.length ? (
            <div className="cdp-empty">No {label.toLowerCase()} appointments.</div>
          ) : (
            <div className="cdp-group-grid">
              {groupRows.map((a) => (
                <article key={a.external_id} className="cdp-item-card">
                  <div className="cdp-item-row">
                    <strong>{a.service_type || "Appointment"}</strong>
                    <StatusPill status={a.status || (a.completed_at ? "completed" : "scheduled")} />
                  </div>
                  <div className="cdp-item-meta">
                    {formatDateTime(a.scheduled_start)}
                    {a.scheduled_end ? ` to ${formatDateTime(a.scheduled_end)}` : ""}
                  </div>
                  <div className="cdp-item-meta">
                    Technician: {a.technician_name || "Unassigned"} • Route: {a.route_id || "—"}
                  </div>
                  {a.notes ? <div>{String(a.notes).slice(0, 180)}</div> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}

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
