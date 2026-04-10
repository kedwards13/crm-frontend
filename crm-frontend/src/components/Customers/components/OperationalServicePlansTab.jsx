import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listOperationalCustomerServicePlans } from "../../../api/operationsCustomersApi";
import ServicePlanCard from "./ServicePlanCard";
import "../CustomerDetailPage.css";

const money = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

export default function OperationalServicePlansTab({ fieldroutesCustomerId }) {
  const [activeFilter, setActiveFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const params = useMemo(() => {
    const next = { page_size: 50 };
    if (activeFilter === "active") next.active = true;
    if (activeFilter === "inactive") next.active = false;
    return next;
  }, [activeFilter]);

  const fetchPage = useCallback(
    async ({ targetPage, append }) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const { data } = await listOperationalCustomerServicePlans(fieldroutesCustomerId, {
          page: targetPage,
          ...params,
        });
        const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setTotalCount(Number(data?.count || 0) || rows.length);
        setHasNext(Boolean(data?.next));
        setPage(targetPage);
        setPlans((prev) => (append ? prev.concat(rows) : rows));
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || "Unable to load agreements.");
        if (!append) setPlans([]);
        setHasNext(false);
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [fieldroutesCustomerId, params]
  );

  useEffect(() => {
    void fetchPage({ targetPage: 1, append: false });
  }, [fetchPage]);

  const totals = useMemo(() => {
    const monthly = plans.reduce((sum, plan) => sum + Number(plan?.recurring_charge || plan?.monthly_value || 0), 0);
    const contract = plans.reduce((sum, plan) => sum + Number(plan?.price || plan?.contract_value || 0), 0);
    const active = plans.filter((plan) => Boolean(plan?.is_active)).length;
    return { monthly, contract, active };
  }, [plans]);

  if (loading) return <div className="cdp-empty">Loading agreements…</div>;
  if (error) return <div className="cdp-empty">{error}</div>;

  return (
    <div className="cdp-stack">
      <div className="cdp-actions-row">
        {[
          ["active", "Active"],
          ["inactive", "Inactive"],
          ["all", "All"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`cdp-btn ${activeFilter === key ? "primary" : ""}`}
            onClick={() => setActiveFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cdp-summary-strip">
        <div className="cdp-summary-tile">
          <span>Agreements</span>
          <strong>{totalCount || plans.length}</strong>
        </div>
        <div className="cdp-summary-tile">
          <span>Active</span>
          <strong>{activeFilter === "inactive" ? 0 : totals.active}</strong>
        </div>
        <div className="cdp-summary-tile">
          <span>MRR</span>
          <strong>{money(totals.monthly)}</strong>
        </div>
        <div className="cdp-summary-tile">
          <span>Contract Value</span>
          <strong>{money(totals.contract)}</strong>
        </div>
      </div>

      {!plans.length ? (
        <div className="cdp-empty">No agreements found.</div>
      ) : (
        <div className="cdp-stack">
          {plans.map((plan, index) => (
            <ServicePlanCard
              key={plan.external_id || plan.id || `${fieldroutesCustomerId}-${index}`}
              plan={plan}
              defaultExpanded={index === 0}
            />
          ))}
        </div>
      )}

      <div className="cdp-footer">
        <div>
          Showing <strong>{plans.length}</strong> of <strong>{totalCount || plans.length}</strong>
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
