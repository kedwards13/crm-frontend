import React from "react";
import { AlertTriangle, Check, Circle, Clock3, Lock, X } from "lucide-react";
import { clean } from "./utils";

const TONE_BY_KIND = {
  appointment: {
    completed: "completed",
    scheduled: "scheduled",
    in_progress: "active",
    canceled: "canceled",
    other: "muted",
  },
  execution: {
    preview: "muted",
    modified: "scheduled",
    applied: "completed",
    skipped: "warning",
    blocked: "warning",
    failed: "failed",
  },
  sync: {
    synced: "completed",
    partial: "warning",
    drift: "failed",
    local_only: "muted",
    stale: "warning",
  },
  lock: {
    finalized: "locked",
    locked: "locked",
  },
};

export const resolveStatusTone = (kind, value) => {
  const normalizedKind = clean(kind) || "appointment";
  const normalizedValue = clean(value).toLowerCase();
  return TONE_BY_KIND[normalizedKind]?.[normalizedValue] || "muted";
};

const ICON_BY_TONE = {
  completed: Check,
  scheduled: Circle,
  active: Clock3,
  warning: AlertTriangle,
  failed: X,
  canceled: X,
  locked: Lock,
  muted: Circle,
};

function StatusIndicator({
  label = "",
  kind = "appointment",
  value = "",
  tone = "",
  className = "",
  showLabel = false,
}) {
  const resolvedTone = clean(tone) || resolveStatusTone(kind, value || label);
  const accessibleLabel = clean(label || value) || "Status";
  const Icon = ICON_BY_TONE[resolvedTone] || Circle;
  return (
    <span
      className={[
        "dispatch-status-indicator",
        `is-${resolvedTone}`,
        showLabel ? "has-label" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      <Icon size={12} aria-hidden="true" />
      {showLabel ? <span>{accessibleLabel}</span> : null}
    </span>
  );
}

export default React.memo(StatusIndicator);
