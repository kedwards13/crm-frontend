import React, { useEffect, useRef, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { FileText, GripVertical, Lock, MessageSquare, UserRound } from "lucide-react";
import StatusIndicator from "./StatusIndicator";
import { formatCurrency, formatTime, getVisualState } from "./utils";

const STATE_LABEL = {
  preview: "Preview",
  modified: "Modified",
  applied: "Applied",
  skipped: "Skipped",
  blocked: "Blocked",
  failed: "Failed",
};

const STOP_ACTIONS = [
  "Appointment Card",
  "Customer Card",
  "Cancel Appointment",
  "Reschedule",
  "Service Notification",
  "Appt Commission",
  "Shift Appts Up",
  "Shift Appts Down",
  "Lock Appointment",
];

function AppointmentCard({
  appointment,
  routeId,
  selected = false,
  selectedForApply = false,
  execution = null,
  onSelect,
  onToggleSelected,
  showReminders = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: appointment.id,
    data: {
      type: "appointment",
      routeId,
    },
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const visualState = getVisualState(appointment, execution);
  const isLocked =
    appointment.classification === "LOCKED" ||
    appointment.classificationReasons?.includes("finalized_window_locked");
  const hasReminder =
    Boolean(
      appointment?.metadata?.next_reminder_at ||
        appointment?.metadata?.last_reminder_at ||
        appointment?.metadata?.reminder_status ||
        appointment?.metadata?.reminderStatus ||
        appointment?.metadata?.reminder_due
    ) || Boolean(appointment.notes);
  const displayStart =
    appointment.computedStart ||
    formatTime(appointment.proposedStart || appointment.currentStart);
  const displayEnd = appointment.computedEnd
    ? appointment.computedEnd
    : appointment.proposedEnd || appointment.currentEnd
      ? formatTime(appointment.proposedEnd || appointment.currentEnd)
      : "";
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        menuRef.current = node;
      }}
      style={style}
      className={[
        "dispatch-pill",
        `is-${visualState}`,
        selected ? "is-selected" : "",
        selectedForApply ? "is-selected-for-apply" : "",
        isDragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="dispatch-pill-row"
        role="button"
        tabIndex={0}
        onClick={() => {
          onSelect?.(appointment);
          setMenuOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(appointment);
            setMenuOpen(false);
          }
        }}
        title={appointment.customerName}
      >
        <span className="dispatch-pill-time">{displayStart}</span>
        <span className="dispatch-pill-copy">
          <strong>{appointment.customerName}</strong>
        </span>
        <span className="dispatch-pill-icons">
          {hasReminder ? (
            <span
              className={`dispatch-pill-reminder ${showReminders ? "is-active" : ""}`}
              title="Reminder activity or notes available"
              aria-label="Reminder activity or notes available"
            >
              <MessageSquare size={12} />
            </span>
          ) : null}
          {isLocked ? <StatusIndicator kind="lock" value="locked" label="Locked" /> : null}
          <StatusIndicator
            kind="appointment"
            value={appointment.status}
            label={appointment.status || "scheduled"}
          />
          {appointment.value ? <span className="dispatch-pill-value">{formatCurrency(appointment.value)}</span> : null}
          <button
            type="button"
            className="dispatch-pill-handle"
            aria-label="Drag appointment"
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={12} />
          </button>
        </span>
      </div>

      <div className="dispatch-pill-hovercard" role="tooltip">
        <div className="dispatch-pill-hovercopy">
          <strong>{appointment.customerName}</strong>
          <span>{appointment.serviceName}</span>
          <span>{STATE_LABEL[visualState] || "Preview"}</span>
          <span>
            {displayStart}
            {displayEnd ? ` - ${displayEnd}` : ""}
            {appointment.value ? ` · ${formatCurrency(appointment.value)}` : ""}
          </span>
          {appointment.address ? <span>{appointment.address}</span> : null}
          {appointment.notes ? <span>{appointment.notes}</span> : null}
        </div>
        <div className="dispatch-pill-hover-actions">
          <button
            type="button"
            className={`dispatch-pill-hover-btn ${selectedForApply ? "is-active" : ""}`}
            aria-label={selectedForApply ? "Remove from apply set" : "Add to apply set"}
            aria-pressed={selectedForApply}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelected?.(appointment.id);
            }}
          >
            {selectedForApply ? "Queued" : "Queue"}
          </button>
          <button
            type="button"
            className="dispatch-pill-hover-btn"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((current) => !current);
            }}
            aria-expanded={menuOpen}
          >
            <FileText size={12} />
            Actions
          </button>
          {isLocked ? (
            <span className="dispatch-pill-hover-tag">
              <Lock size={12} />
              Locked
            </span>
          ) : null}
        </div>
      </div>

      <div>
        {menuOpen ? (
          <div className="dispatch-pill-menu" role="menu" aria-label="Appointment actions">
            {STOP_ACTIONS.map((action) => (
              <button
                key={`${appointment.id}-${action}`}
                type="button"
                className="dispatch-pill-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                {action === "Appointment Card" ? <FileText size={13} /> : null}
                {action === "Customer Card" ? <UserRound size={13} /> : null}
                <span>{action}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default React.memo(AppointmentCard);
