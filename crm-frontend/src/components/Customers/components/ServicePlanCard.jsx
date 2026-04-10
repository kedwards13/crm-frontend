import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import Badge from "../../ui/badge";
import "./ServicePlanCard.css";

const clean = (value) => String(value || "").trim();

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

const statusBadge = (status) => {
  const normalized = clean(status).toLowerCase();
  if (normalized === "active") return { label: "Active", color: "emerald" };
  if (normalized === "paused") return { label: "Paused", color: "yellow" };
  if (normalized === "pending") return { label: "Pending", color: "blue" };
  if (["expired", "canceled", "cancelled", "inactive"].includes(normalized)) {
    return { label: normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "Inactive", color: "gray" };
  }
  return { label: normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "Unknown", color: "gray" };
};

export default function ServicePlanCard({ plan, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const title = clean(plan?.plan_name) || clean(plan?.offering?.name) || "Subscription";
  const badge = statusBadge(plan?.status || (plan?.is_active ? "active" : ""));
  const soldDate = plan?.sold_date || plan?.sold_at || plan?.contract_start || plan?.created_at;
  const soldBy = clean(plan?.sold_by_name || plan?.assigned_rep_name || plan?.owner_name || plan?.sales_rep_name);
  const repFallback = clean(plan?.sold_by_external_id || plan?.assigned_rep_external_id);
  const repLabel = soldBy || repFallback || "—";
  const mrr = plan?.recurring_charge || plan?.monthly_value || plan?.monthly_amount;
  const contractValue = plan?.price || plan?.contract_value || plan?.total_contract_value;
  const detailRows = useMemo(
    () =>
      [
        ["Frequency", clean(plan?.frequency_label || plan?.frequency || plan?.billing_frequency) || "—"],
        ["Sold date", formatDate(soldDate)],
        ["Sold rep", repLabel],
        ["Next service", formatDate(plan?.next_service || plan?.next_service_date)],
        ["Next billing", formatDate(plan?.next_billing_date)],
        ["Last service", formatDate(plan?.last_completed || plan?.last_service_date)],
        ["Renewal", formatDate(plan?.renewal_date || plan?.contract_end)],
        ["Cancellation reason", clean(plan?.cancellation_reason || plan?.cancel_reason) || "—"],
        ["Service type", clean(plan?.service_type_name || plan?.service_type_id) || "—"],
      ],
    [plan, repLabel, soldDate]
  );

  return (
    <article className={`spc ${expanded ? "is-expanded" : ""}`}>
      <button type="button" className="spc-trigger" onClick={() => setExpanded((value) => !value)}>
        <div className="spc-topline">
          <div className="spc-title-wrap">
            <strong>{title}</strong>
            <div className="spc-subline">
              <span>Sold {formatDate(soldDate)}</span>
              <span>Rep {repLabel}</span>
            </div>
          </div>
          <div className="spc-badges">
            <Badge color={badge.color}>{badge.label}</Badge>
            <span className="spc-chevron" aria-hidden="true">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </div>
        </div>

        <div className="spc-summary">
          <div className="spc-summary-item">
            <span>MRR</span>
            <strong>{formatMoney(mrr)}</strong>
          </div>
          <div className="spc-summary-item">
            <span>Contract</span>
            <strong>{formatMoney(contractValue)}</strong>
          </div>
          <div className="spc-summary-item">
            <span>Frequency</span>
            <strong>{clean(plan?.frequency_label || plan?.frequency || plan?.billing_frequency) || "—"}</strong>
          </div>
          <div className="spc-summary-item">
            <span>Next service</span>
            <strong>{formatDate(plan?.next_service || plan?.next_service_date)}</strong>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="spc-details">
          {detailRows.map(([label, value]) => (
            <div key={label} className="spc-detail-row">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
