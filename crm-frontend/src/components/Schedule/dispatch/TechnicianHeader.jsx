import React from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import StatusIndicator from "./StatusIndicator";
import { formatCurrency, formatHours, lastName } from "./utils";

const initialsForName = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

function TechnicianHeader({
  route,
  staffLabel,
  syncStatus = "",
  onAvatarClick,
  onToggleActions,
  actionsOpen = false,
}) {
  const totalStops = Number(route?.metrics?.totalStops || 0);
  const routeHours = formatHours(route?.metrics?.routeMinutes || 0);
  const routeRevenue = formatCurrency(route?.metrics?.routeRevenue || 0);
  const technicianName = route?.technicianName || "Unassigned";
  const compactName = technicianName === "Unassigned" ? technicianName : lastName(technicianName);
  const displayName =
    compactName === "Unassigned" ? compactName : compactName.toUpperCase();
  const warningCount = Array.isArray(route?.warnings) ? route.warnings.length : 0;
  const routeLabel = route?.routeTitle || route?.id || "Route";
  const routeDelta = route?.routeDelta;

  return (
    <header className="dispatch-route-header">
      <div className="dispatch-route-header-main">
        <button
          type="button"
          className="dispatch-route-avatar"
          onClick={onAvatarClick}
          aria-label={`Edit route for ${technicianName}`}
        >
          {initialsForName(technicianName)}
        </button>

        <div className="dispatch-route-identity">
          <div className="dispatch-route-title-row">
            <h3 className="dispatch-route-name" title={technicianName}>
              {displayName}
            </h3>
            <div className="dispatch-route-inline-status">
              {syncStatus ? (
                <StatusIndicator kind="sync" value={syncStatus} label={syncStatus.replace(/_/g, " ")} />
              ) : null}
              {route?.lockState ? (
                <StatusIndicator kind="lock" value={route.lockState} label={route.lockState} />
              ) : null}
              {warningCount ? (
                <span
                  className="dispatch-route-warning-indicator"
                  title={`${warningCount} route warning${warningCount === 1 ? "" : "s"}`}
                  aria-label={`${warningCount} route warning${warningCount === 1 ? "" : "s"}`}
                >
                  <AlertTriangle size={12} />
                </span>
              ) : null}
            </div>
          </div>
          <div className="dispatch-route-inline-meta">
            <span>{totalStops} stops</span>
            <span>{routeHours}</span>
            <span>{routeRevenue}</span>
          </div>
        </div>
      </div>

      <div className="dispatch-route-header-side">
        <button
          type="button"
          className={`dispatch-button secondary dispatch-route-actions-trigger ${actionsOpen ? "is-active" : ""}`}
          onClick={onToggleActions}
          aria-expanded={actionsOpen}
          aria-label={`Open route actions for ${technicianName}`}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="dispatch-route-hovercard">
        <strong>{technicianName}</strong>
        <span>{routeLabel}</span>
        <span>
          {staffLabel} · {totalStops} appointments · {routeHours} · {routeRevenue}
        </span>
        {route?.officeName ? <span>{route.officeName}</span> : null}
        {routeDelta ? (
          <span>
            {routeDelta.appointments_delta > 0 ? "+" : ""}
            {routeDelta.appointments_delta} appts · {routeDelta.drive_minutes_delta > 0 ? "+" : ""}
            {routeDelta.drive_minutes_delta} drive min
          </span>
        ) : null}
        {warningCount ? <span>{warningCount} route warning{warningCount === 1 ? "" : "s"}</span> : null}
      </div>
    </header>
  );
}

export default React.memo(TechnicianHeader);
