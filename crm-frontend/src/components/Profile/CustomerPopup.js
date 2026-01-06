import ReactDOM from "react-dom";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import "./CustomerPopup.css";

import InfoTab from "./ProfileTabs/InfoTab";
import DocumentsTab from "./ProfileTabs/DocumentsTab";
import ContractsTab from "./ProfileTabs/ContractsTab";
import TasksTab from "./ProfileTabs/TasksTab";
import AiTab from "./ProfileTabs/AiTab";
import CommunicationsTab from "./ProfileTabs/CommunicationsTab";
import RevivalTab from "./ProfileTabs/RevivalTab";
import BillingTab from "./ProfileTabs/BillingTab";

import { mapEntity } from "../../utils/contactMapper";
import api from "../../apiClient";
import { createAppointment } from "../../api/appointmentsApi";
import {
  listServiceTypes,
  listTechnicians,
  createSchedule,
  quickBook,
  listAvailability,
} from "../../api/schedulingApi";
import { getIndustryKey, getSchedulingConfig } from "../../constants/uiRegistry";

/* ============================================================
   TEMPORARY APPOINTMENTS TAB
============================================================ */
function AppointmentTab() {
  return (
    <div style={{ padding: 20 }}>
      <h3>Appointments</h3>
      <p>Scheduling UI coming next step.</p>
    </div>
  );
}

const formatDateInput = (value) => value.toISOString().slice(0, 10);
const formatTimeInput = (value) => value.toTimeString().slice(0, 5);
const getRoundedTime = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  now.setMinutes(rounded % 60);
  if (rounded >= 60) now.setHours(now.getHours() + 1);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now;
};

/* ============================================================
   MAIN POPUP
============================================================ */
function CustomerPopupInternal({ lead, leadType = "customer", onClose }) {
  const [record, setRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("info");

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const industryKey = getIndustryKey("general");
  const schedulingConfig = getSchedulingConfig(industryKey);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceLabelInput, setServiceLabelInput] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [durationMins, setDurationMins] = useState(
    schedulingConfig.defaultDurationMins || 60
  );
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [assignedTechId, setAssignedTechId] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: "Analyzing this record..." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const chatRef = useRef(null);

  const serviceLabel = schedulingConfig.serviceLabel || "Service Type";
  const staffLabel = schedulingConfig.staffLabel || "Technician";
  const locationLabel = schedulingConfig.locationLabel || "Location";

  /* ---------------------------------------------------------
     LOCK BODY SCROLL
  --------------------------------------------------------- */
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingServiceTypes(true);
      try {
        const { data } = await listServiceTypes();
        const rows = Array.isArray(data) ? data : data?.results || [];
        if (mounted) setServiceTypes(rows);
      } catch {
        if (mounted) setServiceTypes([]);
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
    if (!showScheduleModal || !record) return;
    const fallbackAddress = record.address || record.raw?.address || "";
    setLocationValue(fallbackAddress);
    setAvailabilityError("");
    setSelectedSlot(null);

    if (!dateValue) {
      setDateValue(formatDateInput(new Date()));
    }
    if (!timeValue) {
      setTimeValue(formatTimeInput(getRoundedTime()));
    }
  }, [showScheduleModal, record, dateValue, timeValue]);

  /* ---------------------------------------------------------
     SCHEDULING
  --------------------------------------------------------- */
  const normalizeAvailability = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
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

  const fetchAvailability = useCallback(async () => {
    if (!showScheduleModal) return;
    if (!serviceTypeId || serviceTypeId === "custom" || !dateValue) {
      setAvailabilitySlots([]);
      setAvailabilityError("");
      return;
    }

    setLoadingAvailability(true);
    setAvailabilityError("");
    try {
      const params = {
        service_type_id: serviceTypeId,
        date: dateValue,
        start_date: dateValue,
        end_date: dateValue,
        duration_minutes:
          Number(durationMins) || schedulingConfig.defaultDurationMins || 60,
      };
      if (assignedTechId) params.assigned_to = assignedTechId;
      const { data } = await listAvailability(params);
      const slots = normalizeAvailability(data)
        .map((slot, index) => {
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
    } catch {
      setAvailabilityError("Unable to load availability.");
      setAvailabilitySlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [
    assignedTechId,
    dateValue,
    durationMins,
    schedulingConfig.defaultDurationMins,
    serviceTypeId,
    showScheduleModal,
  ]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const resetScheduleForm = useCallback(() => {
    setServiceTypeId("");
    setServiceLabelInput("");
    setAssignedTechId("");
    setLocationValue("");
    setDateValue("");
    setTimeValue("");
    setDurationMins(schedulingConfig.defaultDurationMins || 60);
    setScheduleNotes("");
    setAvailabilitySlots([]);
    setAvailabilityError("");
    setSelectedSlot(null);
  }, [schedulingConfig.defaultDurationMins]);

  const closeScheduleModal = useCallback(() => {
    setShowScheduleModal(false);
    resetScheduleForm();
  }, [resetScheduleForm]);

  /* ---------------------------------------------------------
     UNIVERSAL CUSTOMER RESOLUTION (THE FIX)
  --------------------------------------------------------- */
  useEffect(() => {
    if (!lead) return;

    if (lead?.object && lead?.id == null && lead?.customer_id == null) {
      setRecord(mapEntity(lead));
      return;
    }
  
    async function resolveIdentity() {
      try {
        // STEP 1 — always map first (lead/revival/customer)
        const mapped = mapEntity(lead);
  
        // If already a complete customer → done
        if (mapped.object === "customer" && mapped.phones?.length > 0) {
          setRecord(mapped);
          return;
        }
  
        // STEP 2 — Universal ID direct resolution
        if (mapped.universal_id) {
          try {
            const { data } = await api.get(
              `/customers/by-uid/${mapped.universal_id}/`
            );
            if (data) {
              // 🔥 Merge mapped lead/revival info so mapper can combine phones/emails
              setRecord(
                mapEntity({
                  ...data,
                  lead: mapped.raw,
                })
              );
              return;
            }
          } catch {}
        }
  
        // STEP 3 — Revival fallback using customer_id
        if (mapped.object === "revival" && mapped.customer_id) {
          try {
            const { data } = await api.get(
              `/customers/${mapped.customer_id}/`
            );
            if (data) {
              // 🔥 Merge revival + customer fully
              setRecord(
                mapEntity({
                  ...data,
                  lead: mapped.raw, // revival identity passes through mapper
                })
              );
              return;
            }
          } catch {}
        }
  
        // STEP 4 — Lead fallback (no customer yet)
        if (mapped.object === "lead") {
          setRecord(mapped);
          return;
        }
  
        // STEP 5 — Unknown fallback
        setRecord(mapEntity(mapped.raw || mapped));
      } catch (err) {
        console.error("Popup load error:", err);
        toast.error("Failed loading profile");
  
        // 🔥 Emergency fallback
        setRecord(mapEntity(lead));
      }
    }
  
    resolveIdentity();
  }, [lead]);
  
  
  /* ---------------------------------------------------------
     LOADING GATE
  --------------------------------------------------------- */
  if (!record) {
    return (
      <div className="customer-popup-wrapper no-blur">
        <div className="popup">Loading...</div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     API PATHS
  --------------------------------------------------------- */
  const updatePaths = {
    lead: `/leads/crm-leads/${record.id}/`,
    customer: `/customers/${record.id}/`,
    revival: `/revival/scanner/${record.id}/`,
  };

  const updateUrl =
    record.object === "lead"
      ? updatePaths.lead
      : record.object === "revival"
      ? updatePaths.revival
      : updatePaths.customer;

  const convertUrl =
    record.object === "lead"
      ? `/leads/${record.id}/convert-to-customer/`
      : record.object === "revival"
      ? "/revival/transfer/"
      : null;

  const isLead = record.object === "lead";
  const isCustomer = record.object === "customer";
  const isRevival = record.object === "revival";
  const isCreate = !record.id;
  const canUpdateStatus = (isLead || isRevival) && !isCreate;
  const canSchedule = !!record.id;
  const displayIndustry = record.raw?.industry || record.industry || "general";

  const buildLeadPayload = (raw = {}) => {
    const payload = {};
    const name = raw.name || raw.full_name;
    const primaryEmail = raw.primary_email ?? raw.email;
    const primaryPhone = raw.primary_phone ?? raw.phone_number;

    if (raw.first_name !== undefined) payload.first_name = raw.first_name;
    if (raw.last_name !== undefined) payload.last_name = raw.last_name;
    if (name !== undefined) payload.name = name;

    if (primaryEmail !== undefined) payload.primary_email = primaryEmail;
    if (primaryPhone !== undefined) payload.primary_phone = primaryPhone;

    if (raw.email !== undefined || primaryEmail !== undefined) {
      payload.email = raw.email ?? primaryEmail ?? "";
    }
    if (raw.phone_number !== undefined || primaryPhone !== undefined) {
      payload.phone_number = raw.phone_number ?? primaryPhone ?? "";
    }

    if (raw.industry !== undefined || record.industry) {
      payload.industry = raw.industry || record.industry || "general";
    }
    if (raw.status !== undefined) payload.status = raw.status;

    if (raw.service !== undefined) payload.service = raw.service;
    if (raw.message !== undefined) payload.message = raw.message;
    if (raw.industry_role !== undefined) payload.industry_role = raw.industry_role;
    if (raw.company_name !== undefined) payload.company_name = raw.company_name;
    if (raw.is_business !== undefined) payload.is_business = raw.is_business;
    if (raw.address !== undefined) payload.address = raw.address;
    if (raw.attributes != null) payload.attributes = raw.attributes;
    if (raw.intake_attributes != null) payload.intake_attributes = raw.intake_attributes;
    if (raw.source_host !== undefined) payload.source_host = raw.source_host;
    if (raw.recaptcha_score !== undefined) payload.recaptcha_score = raw.recaptcha_score;

    const offering = raw.offering?.id ?? raw.offering;
    if (offering) payload.offering = offering;

    if (raw.priority_score != null) {
      const score = Number(raw.priority_score);
      payload.priority_score = Number.isFinite(score) ? score : raw.priority_score;
    }
    if (raw.summary != null) payload.summary = raw.summary;
    if (raw.tags != null) payload.tags = raw.tags;

    return payload;
  };

  const buildCustomerPayload = (raw = {}) => {
    const payload = {};
    [
      "first_name",
      "last_name",
      "full_name",
      "company_name",
      "is_business",
      "primary_phone",
      "secondary_phone",
      "primary_email",
      "secondary_email",
      "address",
      "city",
      "state",
      "zip_code",
      "county",
      "country",
      "industry",
      "notes",
    ].forEach((key) => {
      if (raw[key] !== undefined) payload[key] = raw[key];
    });

    if (!payload.industry && record.industry) payload.industry = record.industry;

    return payload;
  };

  /* ---------------------------------------------------------
     SAVE PROFILE
  --------------------------------------------------------- */
  const handleSaveChanges = async () => {
    try {
      if (isLead) {
        const payload = buildLeadPayload(record.raw);
        if (isCreate) {
          const { data } = await api.post("/leads/crm-leads/", payload);
          setRecord(mapEntity(data));
          toast.success("Lead created.");
          return;
        }
        await api.patch(updateUrl, payload);
      } else if (isCustomer) {
        const payload = buildCustomerPayload(record.raw);
        if (isCreate) {
          const { data } = await api.post("/customers/", payload);
          setRecord(mapEntity(data));
          toast.success("Customer created.");
          return;
        }
        await api.patch(updateUrl, payload);
      } else {
        await api.patch(updateUrl, record.raw);
      }

      toast.success("Saved.");
    } catch {
      toast.error(isCreate ? "Create failed." : "Save failed.");
    }
  };

  /* ---------------------------------------------------------
     LEAD → CUSTOMER CONVERSION
  --------------------------------------------------------- */
  const handleConvertToCustomer = async () => {
    if (!convertUrl) return;

    try {
      const { data } = await api.post(convertUrl, {});
      const nextId =
        data?.customer_id ||
        data?.customer?.id ||
        data?.customer ||
        data?.id;
      if (!nextId) throw new Error("Missing customer id");

      const full = await api.get(`/customers/${nextId}/`);
      setRecord(mapEntity(full.data));
      toast.success("Converted.");
    } catch {
      toast.error("Failed to convert.");
    }
  };

  /* ---------------------------------------------------------
     STATUS UPDATE
  --------------------------------------------------------- */
  const STATUS_OPTIONS = isRevival
    ? ["draft", "sent", "accepted", "rejected", "converted", "completed"]
    : ["new", "contacted", "qualified", "scheduled", "closed", "dead"];

  const updateStatus = async (status) => {
    try {
      if (!canUpdateStatus) return;

      await api.patch(updateUrl, { status });

      setRecord((prev) => ({
        ...prev,
        raw: {
          ...prev.raw,
          status,
        },
      }));

      toast.success("Status updated");
      setShowStatusModal(false);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const submitSchedule = async () => {
    const hasServiceTypes = serviceTypes.length > 0;
    const isCustomService = serviceTypeId === "custom";
    const needsServiceType = hasServiceTypes && !isCustomService;
    const hasServiceLabel = serviceLabelInput.trim().length > 0;
    if (needsServiceType && !serviceTypeId) {
      toast.error(`Select a ${serviceLabel.toLowerCase()}.`);
      return;
    }
    if (isCustomService && !hasServiceLabel) {
      toast.error(`Enter a ${serviceLabel.toLowerCase()}.`);
      return;
    }
    if (!hasServiceTypes && !hasServiceLabel) {
      toast.error(`Enter a ${serviceLabel.toLowerCase()}.`);
      return;
    }

    if (!selectedSlot && (!dateValue || !timeValue)) {
      toast.error("Select a date and time.");
      return;
    }

    const slotStart = selectedSlot?.start ? new Date(selectedSlot.start) : null;
    const slotEnd = selectedSlot?.end ? new Date(selectedSlot.end) : null;
    const start = slotStart || new Date(`${dateValue}T${timeValue}`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Invalid date/time.");
      return;
    }

    const duration = Number(durationMins) || schedulingConfig.defaultDurationMins || 60;
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
      if (customerId) {
        if (serviceTypeId && serviceTypeId !== "custom") {
          const quickPayload = {
            customer_id: customerId,
            service_type_id: serviceTypeId,
            start: start.toISOString(),
            notes,
          };
          if (locationValue?.trim()) {
            quickPayload.address = { address: locationValue.trim() };
          }
          if (assignedTechId) quickPayload.assigned_to = assignedTechId;
          await quickBook(quickPayload);
        } else {
          const schedulePayload = {
            customer: customerId,
            scheduled_start: start.toISOString(),
            scheduled_end: end.toISOString(),
            status: "pending",
            notes,
          };
          if (assignedTechId) {
            schedulePayload.assigned_technician = assignedTechId;
          }
          if (locationValue?.trim()) {
            schedulePayload.metadata = {
              address: locationValue.trim(),
            };
          }
          await createSchedule(schedulePayload);
        }
      } else {
        const appointmentPayload = {
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          notes,
          lead: record.object === "lead" ? record.id : undefined,
        };
        await createAppointment(appointmentPayload);
      }
      toast.success("Scheduled!");
      closeScheduleModal();
    } catch {
      toast.error("Error scheduling");
    }
  };

  /* ---------------------------------------------------------
     TABS
  --------------------------------------------------------- */
  const renderTab = () => {
    const raw = { ...record.raw, object: record.object, industry: record.industry };

    switch (activeTab) {
      case "info":
        return (
          <InfoTab
            lead={raw}
            onChange={(e) =>
              setRecord((prev) => ({
                ...prev,
                raw: { ...prev.raw, [e.target.name]: e.target.value },
              }))
            }
          />
        );
      case "revival":
        return <RevivalTab customer={record} />;
      case "contracts":
        return <ContractsTab lead={raw} />;
      case "documents":
        return <DocumentsTab lead={raw} />;
      case "tasks":
        return <TasksTab lead={raw} />;
      case "ai":
        return (
          <AiTab
            lead={record}
            aiMessages={aiMessages}
            aiInput={aiInput}
            setAiInput={setAiInput}
            setAiMessages={setAiMessages}
            chatRef={chatRef}
          />
        );
      case "billing":
        return <BillingTab />;
      case "comms":
      case "communications":
        return <CommunicationsTab lead={record} />;
      case "appointments":
        return <AppointmentTab />;
      default:
        return <div style={{ padding: 20 }}>Unknown</div>;
    }
  };

  /* ---------------------------------------------------------
     JSX
  --------------------------------------------------------- */
  return (
    <div className="customer-popup-wrapper no-blur">
      <div className="popup">
        {/* HEADER */}
        <div className="popup-header">
          <div>
            <div className="popup-title">
              {record.full_name ||
                record.raw?.name ||
                (isLead ? "New Lead" : isRevival ? "Revival" : "New Customer")}
            </div>
            <div className="popup-subtitle">
              {record.object === "lead"
                ? "Lead"
                : record.object === "revival"
                ? "Revival"
                : "Customer"}{" "}
              - {displayIndustry}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            X
          </button>
        </div>

        {/* NAV TABS */}
        <div className="popup-navbar">
          {[
            "info",
            "revival",
            "contracts",
            "documents",
            "tasks",
            "ai",
            "billing",
            "comms",
            "appointments"
          ].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "nav-pill active" : "nav-pill"}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="popup-content">{renderTab()}</div>

        {/* FOOTER */}
        <div className="popup-actions">
          {isLead && convertUrl && !isCreate && (
            <button className="action-btn" onClick={handleConvertToCustomer}>
              Convert
            </button>
          )}

          <button
            className="action-btn"
            onClick={() => setShowScheduleModal(true)}
            disabled={!canSchedule}
            title={!canSchedule ? "Save first to schedule" : undefined}
          >
            Schedule
          </button>

          {canUpdateStatus && (
            <button className="action-btn" onClick={() => setShowStatusModal(true)}>
              Status
            </button>
          )}

          <button className="action-btn primary" onClick={handleSaveChanges}>
            {isCreate ? "Create" : "Save"}
          </button>
        </div>
      </div>

      {/* STATUS MODAL */}
      {showStatusModal && canUpdateStatus && (
        <div className="status-popup">
          <div className="status-popup-inner">
            <h3 className="status-title">Update Status</h3>

            <div className="status-options">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className="status-option"
                  onClick={() => updateStatus(s)}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            <button className="status-cancel" onClick={() => setShowStatusModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
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
                    <option value="custom">Custom service</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter service name"
                    value={serviceLabelInput}
                    onChange={(e) => setServiceLabelInput(e.target.value)}
                  />
                )}

                {serviceTypeId === "custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom service"
                    value={serviceLabelInput}
                    onChange={(e) => setServiceLabelInput(e.target.value)}
                  />
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
                    {!serviceTypeId || serviceTypeId === "custom" ? (
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
                            setTimeValue(formatTimeInput(start));
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
                    <label>Time</label>
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => {
                        setTimeValue(e.target.value);
                        setSelectedSlot(null);
                      }}
                    />
                  </div>
                  <div>
                    <label>Duration (mins)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="status-options schedule-actions">
              <button
                className="status-cancel"
                onClick={closeScheduleModal}
              >
                Cancel
              </button>

              <button className="action-btn primary" onClick={submitSchedule}>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PORTAL WRAPPER
============================================================ */
export default function CustomerPopup(props) {
  const root = document.getElementById("modal-root");
  if (!root) return null;

  return ReactDOM.createPortal(<CustomerPopupInternal {...props} />, root);
}
