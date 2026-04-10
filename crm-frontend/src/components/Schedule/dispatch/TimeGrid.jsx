import React from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertTriangle, Clock3 } from "lucide-react";
import AppointmentCard from "./AppointmentCard";
import { buildTimelineEntries, formatMinutes, formatTime } from "./utils";

function TimeGrid({
  route,
  selectedAppointmentId,
  selectedForApplyIds = [],
  executionByKey,
  onSelectAppointment,
  onToggleApplySelection,
}) {
  const timelineEntries = route.timelineEntries || buildTimelineEntries(route, route.stops);

  return (
    <div className="dispatch-time-grid">
      <div className="dispatch-time-grid-head">
        <span>{route.routeStart ? formatTime(route.routeStart) : "—"}</span>
        <span>{route.routeEnd ? formatTime(route.routeEnd) : "—"}</span>
      </div>

      <SortableContext items={route.stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
        <div className="dispatch-route-pill-list">
          {timelineEntries.map((entry) => {
            if (entry.type === "gap") {
              return (
                <div key={entry.id} className="dispatch-time-gap">
                  <Clock3 size={12} />
                  <span>{formatMinutes(entry.minutes)} gap</span>
                </div>
              );
            }
            if (entry.type === "overlap") {
              return (
                <div key={entry.id} className="dispatch-time-gap is-overlap">
                  <AlertTriangle size={12} />
                  <span>{formatMinutes(entry.minutes)} overlap</span>
                </div>
              );
            }

            const appointment = entry.appointment;
            const execution =
              executionByKey.get(String(appointment.crmAppointmentId)) ||
              executionByKey.get(String(appointment.externalId)) ||
              executionByKey.get(String(appointment.id)) ||
              null;

            return (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                routeId={route.id}
                selected={String(selectedAppointmentId) === String(appointment.id)}
                selectedForApply={selectedForApplyIds.includes(String(appointment.id))}
                execution={execution}
                onSelect={onSelectAppointment}
                onToggleSelected={onToggleApplySelection}
              />
            );
          })}

          {!route.stops.length ? (
            <div className="dispatch-route-empty">No scheduled stops in this route for the selected window.</div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

export default React.memo(TimeGrid);
