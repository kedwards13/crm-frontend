import React, { useEffect, useMemo, useState } from "react";
import { listServicePlans } from "../../../api/schedulingApi";
import ServicePlanCard from "./ServicePlanCard";
import "../CustomerDetailPage.css";

const toRows = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

const clean = (value) => String(value || "").trim();

export default function ServicePlansTab({ customer }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await listServicePlans({ page_size: 250 });
        if (!mounted) return;
        setPlans(toRows(res?.data));
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Unable to load service plans.");
        setPlans([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const pk = clean(customer?.id || customer?.raw?.id);
    if (!pk) return [];
    return plans.filter((p) => clean(p.customer) === pk || clean(p.customer_id) === pk);
  }, [plans, customer]);

  const totals = useMemo(() => {
    const monthly = filtered.reduce((sum, plan) => sum + Number(plan?.recurring_charge || plan?.monthly_value || 0), 0);
    const contract = filtered.reduce((sum, plan) => sum + Number(plan?.price || plan?.contract_value || 0), 0);
    const active = filtered.filter((plan) => String(plan?.status || "").toLowerCase() === "active").length;
    return { monthly, contract, active };
  }, [filtered]);

  if (loading) return <div className="cdp-empty">Loading service plans…</div>;
  if (error) return <div className="cdp-empty">{error}</div>;

  if (!filtered.length) {
    return <div className="cdp-empty">No service plans found for this customer.</div>;
  }

  return (
    <div className="cdp-stack">
      <div className="cdp-summary-strip">
        <div className="cdp-summary-tile">
          <span>Agreements</span>
          <strong>{filtered.length}</strong>
        </div>
        <div className="cdp-summary-tile">
          <span>Active</span>
          <strong>{totals.active}</strong>
        </div>
        <div className="cdp-summary-tile">
          <span>MRR</span>
          <strong>{totals.monthly ? totals.monthly.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—"}</strong>
        </div>
        <div className="cdp-summary-tile">
          <span>Contract Value</span>
          <strong>{totals.contract ? totals.contract.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—"}</strong>
        </div>
      </div>
      <div className="cdp-stack">
      {filtered.map((plan) => (
        <ServicePlanCard key={plan.id} plan={plan} />
      ))}
      </div>
    </div>
  );
}
