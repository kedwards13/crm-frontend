import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  listServiceTypes,
  listTechnicians,
} from "../../../api/schedulingApi";
import {
  createAppointment,
  getAppointmentAvailableSlots,
} from "../../../api/appointmentsApi";

const formatDateInput = (value) => value.toISOString().slice(0, 10);
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

const normalizeAvailability = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.slot_windows)) return payload.slot_windows;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.slots)) return payload.slots;
  if (Array.isArray(payload.availability)) return payload.availability;
  return [];
};

const formatSlotLabel = (start, end) => {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "Unknown";
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const startTime = timeFormatter.format(startDate);
  const dateLabel = dateFormatter.format(startDate);
  if (!end) return `${dateLabel} - ${startTime}`;

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return `${dateLabel} - ${startTime}`;
  const endTime = timeFormatter.format(endDate);
  return `${dateLabel} ${startTime} - ${endTime}`;
};

export default function ScheduleModal({ record, schedulingConfig, onClose }) {
  const defaultDuration = schedulingConfig?.defaultDurationMins || 60;

  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceLabelInput, setServiceLabelInput] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [durationMins, setDurationMins] = useState(defaultDuration);
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(false);
  const [serviceTypesError, setServiceTypesError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [assignedTechId, setAssignedTechId] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const serviceLabel = schedulingConfig?.serviceLabel || "Service Type";
  const staffLabel = schedulingConfig?.staffLabel || "Technician";
  const locationLabel = schedulingConfig?.locationLabel || "Location";

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingServiceTypes(true);
      setServiceTypesError("");
      try {
        const { data } = await listServiceTypes();
        const rows = Array.isArray(data) ? data : data?.results || [];
        if (mounted) {
          setServiceTypes(rows);
          if (!rows.length) {
            setServiceTypesError("No services configured. Add offerings in Settings.");
          }
        }
      } catch (err) {
        if (mounted) {
          setServiceTypes([]);
          setServiceTypesError(
            err?.response?.data?.detail ||
              err?.message ||
              "Unable to load services."
          );
        }
      } finally {
        if (mounted) setLoadingServiceTypes(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTechnicians(true);
      try {
        const { data } = await listTechnicians();
        const rows = Array.isArray(data) ? data : data?.results || [];
        if (mounted) setTechnicians(rows);
      } catch {
        if (mounted) setTechnicians([]);
      } finally {
        if (mounted) setLoadingTechnicians(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const selectedService = serviceTypes.find(
      (service) => String(service.id) === String(serviceTypeId)
    );
    if (selectedService?.default_duration_minutes) {
      setDurationMins(selectedService.default_duration_minutes);
    }
    if (serviceTypeId && serviceTypeId !== "custom") {
      setServiceLabelInput("");
    }
    setSelectedSlot(null);
  }, [serviceTypeId, serviceTypes]);

  useEffect(() => {
    if (!record) return;
    const fallbackAddress = record.address || record.raw?.address || "";
    setLocationValue((prev) => prev || fallbackAddress);
    setAvailabilityError("");
    setSelectedSlot(null);
    setDateValue((prev) => prev || formatDateInput(new Date()));
  }, [record]);

  useEffect(() => {
    setDurationMins(defaultDuration);
  }, [defaultDuration]);

  const fetchAvailability = useCallback(async () => {
    if (!serviceTypeId || serviceTypeId === "custom" || !dateValue) {
      setAvailabilitySlots([]);
      setAvailabilityError("");
      return;
    }

    setLoadingAvailability(true);
    setAvailabilityError("");
    try {
      const params = {
        date: dateValue,
        duration: Number(durationMins) || defaultDuration,
      };
      if (serviceTypeId) params.service_type_id = serviceTypeId;
      if (assignedTechId) params.assigned_user = assignedTechId;
      const { data } = await getAppointmentAvailableSlots(params);
      const slots = normalizeAvailability(data)
        .map((slot, index) => {
          if (typeof slot === "string") {
            const startDate = new Date(slot);
            if (Number.isNaN(startDate.getTime())) return null;
            const endDate = new Date(
              startDate.getTime() + (Number(durationMins) || defaultDuration) * 60000
            );
            return {
              id: `${slot}-${index}`,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              raw: { start: startDate.toISOString(), end: endDate.toISOString() },
            };
          }
          const start =
            slot.start ||
            slot.start_time ||
            slot.available_start ||
            slot.scheduled_start ||
            slot.begin ||
            slot.datetime;
          const end =
            slot.end ||
            slot.end_time ||
            slot.available_end ||
            slot.scheduled_end ||
            slot.finish;
          if (!start) return null;
          return { id: slot.id || `${start}-${index}`, start, end, raw: slot };
        })
        .filter(Boolean);
      setAvailabilitySlots(slots);
      if (slots.length === 0) {
        setAvailabilityError("No available slots for this date.");
      } else {
        setSelectedSlot((prev) =>
          prev && slots.find((slot) => slot.id === prev.id) ? prev : slots[0]
        );
      }
    } catch (err) {
      setAvailabilityError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to load availability."
      );
      setAvailabilitySlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [assignedTechId, dateValue, defaultDuration, durationMins, serviceTypeId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  if (!record) return null;

  const submitSchedule = async () => {
    if (submitting) return;

    const hasServiceTypes = serviceTypes.length > 0;
    const isCustomService = serviceTypeId === "custom";
    const hasServiceLabel = serviceLabelInput.trim().length > 0;
    if (!hasServiceTypes) {
      toast.error("No services configured. Add offerings in Settings.");
      return;
    }
    if (!serviceTypeId && !isCustomService) {
      toast.error(`Select a ${serviceLabel.toLowerCase()}.`);
      return;
    }
    if (isCustomService && !hasServiceLabel) {
      toast.error(`Enter a ${serviceLabel.toLowerCase()}.`);
      return;
    }

    if (!selectedSlot) {
      toast.error("Select an available slot.");
      return;
    }

    const start = selectedSlot?.start ? new Date(selectedSlot.start) : null;
    if (!start || Number.isNaN(start.getTime())) {
      toast.error("Invalid date/time.");
      return;
    }

    const duration = Number(durationMins) || defaultDuration;
    const slotEnd = selectedSlot?.end ? new Date(selectedSlot.end) : null;
    const end =
      slotEnd && !Number.isNaN(slotEnd.getTime())
        ? slotEnd
        : new Date(start.getTime() + duration * 60000);

    const customerId =
      record.object === "customer"
        ? record.id
        : record.object === "revival"
        ? record.customer_id
        : null;

    const selectedService = serviceTypes.find(
      (service) => String(service.id) === String(serviceTypeId)
    );
    const serviceLabelText =
      selectedService?.name || serviceLabelInput || "";
    const notes = [
      scheduleNotes,
      serviceLabelText ? `Service: ${serviceLabelText}` : "",
      locationValue ? `Location: ${locationValue}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      setSubmitting(true);
      const appointmentPayload = {
        customer_id: customerId || undefined,
        lead_id: record.object === "lead" ? record.id : undefined,
        assigned_user_id: assignedTechId || undefined,
        assigned_user: assignedTechId || undefined,
        scheduled_at: start.toISOString(),
        start: start.toISOString(),
        end: end.toISOString(),
        duration_minutes: duration,
        duration,
        notes,
        service_type: serviceLabelText || undefined,
      };
      await createAppointment(appointmentPayload);
      toast.success("Scheduled!");
      onClose?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Error scheduling"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="status-popup">
      <div className="status-popup-inner schedule-popup-inner">
        <h3 className="status-title">Schedule Appointment</h3>

        <div className="schedule-modal-grid">
          <div className="schedule-modal-column">
            <label>{serviceLabel}</label>
            {serviceTypes.length > 0 ? (
              <select
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                disabled={loadingServiceTypes}
              >
                <option value="">
                  {loadingServiceTypes
                    ? "Loading services..."
                    : "Select a service"}
                </option>
                {serviceTypes.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name || `Service ${service.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="schedule-empty">
                {serviceTypesError ||
                  "No services configured. Add offerings in Settings."}
              </div>
            )}

            <label>{staffLabel}</label>
            <select
              value={assignedTechId}
              onChange={(e) => {
                setAssignedTechId(e.target.value);
                setSelectedSlot(null);
              }}
              disabled={loadingTechnicians}
            >
              <option value="">
                {loadingTechnicians ? "Loading techs..." : "Auto-assign"}
              </option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.user_name ||
                    tech.user?.full_name ||
                    tech.user?.name ||
                    [tech.user?.first_name, tech.user?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    tech.user?.email ||
                    `Tech ${tech.id}`}
                </option>
              ))}
            </select>

            <label>{locationLabel}</label>
            <input
              type="text"
              placeholder="Service location"
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
            />

            <label>Notes</label>
            <textarea
              rows="4"
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
            />
          </div>

          <div className="schedule-modal-column">
            <label>Date</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => {
                setDateValue(e.target.value);
                setSelectedSlot(null);
              }}
            />

            <div className="schedule-availability">
              <div className="schedule-availability-title">
                Available Slots
              </div>
              <div className="schedule-slots">
                {!serviceTypeId ? (
                  <div className="schedule-muted">
                    Select a service to load availability.
                  </div>
                ) : loadingAvailability ? (
                  <div className="schedule-muted">
                    Loading availability...
                  </div>
                ) : availabilityError ? (
                  <div className="schedule-error">{availabilityError}</div>
                ) : availabilitySlots.length === 0 ? (
                  <div className="schedule-muted">
                    No available slots for this date.
                  </div>
                ) : (
                  availabilitySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      className={`schedule-slot ${
                        selectedSlot?.id === slot.id ? "active" : ""
                      }`}
                      onClick={() => {
                        const start = new Date(slot.start);
                        if (Number.isNaN(start.getTime())) return;
                        setSelectedSlot(slot);
                        setDateValue(formatDateInput(start));
                      }}
                    >
                      {formatSlotLabel(slot.start, slot.end)}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="schedule-time-row">
              <div>
                <label>Duration (mins)</label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value || defaultDuration))}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="status-options schedule-actions">
          <button
            className="status-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button className="btn-save" onClick={submitSchedule} disabled={submitting}>
            {submitting ? "Saving..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
