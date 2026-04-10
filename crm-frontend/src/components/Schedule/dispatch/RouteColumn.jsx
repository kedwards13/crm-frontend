import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { X } from "lucide-react";
import TechnicianHeader from "./TechnicianHeader";
import AppointmentCard from "./AppointmentCard";
import { computeRouteSchedule } from "./utils/schedule";
import { formatHours, formatMinutes } from "./utils";

const ROUTE_ACTIONS = [
  "Assign Pre-Built",
  "Cancel Pre-Built",
  "Recommend",
  "Set Auto Schedule",
  "Map Route / Tech",
  "Move Entire Route",
  "Optimize Route",
  "Route Summary",
  "Auto Assign Times",
  "Delete Route",
  "Complete Entire",
  "Cancel Entire",
  "Lock Route",
];

function RouteColumn({
  route,
  staffLabel,
  selectedAppointmentId,
  selectedForApplyIds = [],
  executionByKey,
  syncStatus = "",
  onSelectAppointment,
  onToggleApplySelection,
  showReminders = false,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: route.id,
    data: {
      type: "route",
      routeId: route.id,
    },
  });
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const scheduledAppointments = useMemo(() => {
    if ((route.stops || []).some((appointment) => appointment?.computedStart)) {
      return route.stops || [];
    }
    return computeRouteSchedule(route.stops || []);
  }, [route.stops]);
  const executionForAppointment = useMemo(
    () =>
      (appointment) =>
        executionByKey.get(String(appointment.crmAppointmentId)) ||
        executionByKey.get(String(appointment.externalId)) ||
        executionByKey.get(String(appointment.id)) ||
        null,
    [executionByKey]
  );

  return (
    <>
      <section
        ref={setNodeRef}
        className={[
          "dispatch-route-card",
          route.modified ? "is-modified" : "",
          isOver ? "is-drop-target" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--route-color": route.routeColor || "var(--accent)" }}
      >
        <div ref={menuRef} className="dispatch-route-header-shell">
          <TechnicianHeader
            route={route}
            staffLabel={staffLabel}
            syncStatus={syncStatus}
            onAvatarClick={() => setEditOpen(true)}
            onToggleActions={() => setActionsOpen((current) => !current)}
            actionsOpen={actionsOpen}
          />

          {actionsOpen ? (
            <div className="dispatch-route-actions-menu" role="menu" aria-label="Route actions">
              {ROUTE_ACTIONS.map((action) => (
                <button
                  key={`${route.id}-${action}`}
                  type="button"
                  className="dispatch-route-action-item"
                  onClick={() => setActionsOpen(false)}
                >
                  {action}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <SortableContext
          items={scheduledAppointments.map((appointment) => appointment.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="dispatch-route-pill-list">
            {scheduledAppointments.map((appointment) => {
              return (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  routeId={route.id}
                  selected={String(selectedAppointmentId) === String(appointment.id)}
                  selectedForApply={selectedForApplyIds.includes(String(appointment.id))}
                  execution={executionForAppointment(appointment)}
                  onSelect={onSelectAppointment}
                  onToggleSelected={onToggleApplySelection}
                  showReminders={showReminders}
                />
              );
            })}

            {!scheduledAppointments.length ? (
              <div className="dispatch-route-empty">
                No scheduled stops in this route for the selected window.
              </div>
            ) : null}
          </div>
        </SortableContext>
      </section>

      {editOpen ? (
        <div className="dispatch-modal" role="dialog" aria-modal="true">
          <div className="dispatch-modal-card">
            <header className="dispatch-modal-head">
              <div>
                <div className="dispatch-header-kicker">Edit Route</div>
                <h3>{route.technicianName || "Unassigned"}</h3>
              </div>
              <button
                type="button"
                className="dispatch-button secondary"
                onClick={() => setEditOpen(false)}
                aria-label="Close route editor"
              >
                <X size={14} />
              </button>
            </header>
            <div className="dispatch-modal-body">
              <div className="dispatch-detail-grid">
                <div>
                  <span>Route ID</span>
                  <strong>{route.id}</strong>
                </div>
                <div>
                  <span>Service Day</span>
                  <strong>{route.serviceDay || "—"}</strong>
                </div>
                <div>
                  <span>Appointments</span>
                  <strong>{route.metrics.totalStops}</strong>
                </div>
                <div>
                  <span>Route Hours</span>
                  <strong>{formatHours(route.metrics.routeMinutes)}</strong>
                </div>
                <div>
                  <span>Drive Time</span>
                  <strong>{formatMinutes(route.metrics.travelMinutes)}</strong>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="dispatch-modal-backdrop"
            onClick={() => setEditOpen(false)}
            aria-label="Close route editor"
          />
        </div>
      ) : null}
    </>
  );
}

export default React.memo(RouteColumn);
