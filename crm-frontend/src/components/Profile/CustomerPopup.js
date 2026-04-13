import ReactDOM from "react-dom";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, GripHorizontal } from "lucide-react";
import { toast } from "react-toastify";
import "./CustomerPopup.css";

import InfoTab from "./ProfileTabs/InfoTab";
import AiTab from "./ProfileTabs/AiTab";
import CommunicationsTab from "./ProfileTabs/CommunicationsTab";
import TimelineTab from "./ProfileTabs/TimelineTab";
import AppointmentsTab from "./ProfileTabs/AppointmentsTab";
import WorkOrdersTab from "./ProfileTabs/WorkOrdersTab";
import InvoicesTab from "./ProfileTabs/InvoicesTab";
import CustomerCampaignsTab from "./ProfileTabs/CustomerCampaignsTab";
import RevivalTab from "./ProfileTabs/RevivalTab";
import NotesTab from "./ProfileTabs/NotesTab";
import FilesTab from "./ProfileTabs/FilesTab";
import ScheduleModal from "../Customers/Modals/ScheduleModal";
import StatusModal from "../Customers/Modals/StatusModal";

import { mapEntity } from "../../utils/contactMapper";
import api from "../../apiClient";
import { getIndustryKey, getSchedulingConfig } from "../../constants/uiRegistry";

/* ============================================================
   DRAGGABLE HOOK (header grip only)
============================================================ */
const useDraggable = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragState = useRef({ active: false, offsetX: 0, offsetY: 0 });

  const handleMouseDown = (e) => {
    const isHandle = e.target.closest(".popup-drag-handle");
    const isBlocked = e.target.closest("[data-no-drag]");
    if (!isHandle || isBlocked) return;

    dragState.current = {
      active: true,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.current.active) return;
      setPosition({
        x: e.clientX - dragState.current.offsetX,
        y: e.clientY - dragState.current.offsetY,
      });
    };

    const handleMouseUp = () => {
      dragState.current = { ...dragState.current, active: false };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return { position, handleMouseDown };
};

/* ============================================================
   MAIN POPUP
============================================================ */
function CustomerPopupInternal({ lead, onClose }) {
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [preferences, setPreferences] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const industryKey = getIndustryKey("general");
  const schedulingConfig = getSchedulingConfig(industryKey);

  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: "Analyzing this record..." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const chatRef = useRef(null);
  const { position, handleMouseDown } = useDraggable();

  /* ---------------------------------------------------------
     LOCK BODY SCROLL
  --------------------------------------------------------- */
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    if (!record) return;
    setFormData(record.raw || {});
  }, [record]);

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/accounts/preferences/");
        if (mounted) setPreferences(data?.preferences || {});
      } catch {
        if (mounted) setPreferences(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
              // Tag as customer — this came from /api/customers/, so it IS a customer.
              setRecord(
                mapEntity({
                  ...data,
                  object: "customer",
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
              // Tag as customer — this came from /api/customers/, so it IS a customer.
              setRecord(
                mapEntity({
                  ...data,
                  object: "customer",
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
     Lead IDs vs Customer IDs are distinct keyspaces. Leads use the
     CRMLead PK (numeric) against /leads/crm-leads/{id}/. Customers use
     either their numeric PK or the customer_id UUID against /customers/{id}/.
     Web-inbox leads that haven't been forwarded to the CRM yet have
     no CRMLead PK — save is blocked until they're added to the pipeline.
  --------------------------------------------------------- */
  const leadUpdateId = record.crm_lead_id || record.raw?.crm_lead_id || record.id;
  const customerUpdateId = record.raw?.customer_id || record.id;

  const updatePaths = {
    lead: `/leads/crm-leads/${leadUpdateId}/`,
    customer: `/customers/${customerUpdateId}/`,
    revival: `/revival/${record.id}/`,
  };

  const updateUrl =
    record.object === "lead"
      ? updatePaths.lead
      : record.object === "revival"
      ? updatePaths.revival
      : updatePaths.customer;

  const convertUrl =
    record.object === "lead"
      ? `/leads/crm-leads/${leadUpdateId}/convert-to-customer/`
      : record.object === "revival"
      ? `/revival/${record.id}/convert/`
      : null;

  const isLead = record.object === "lead";
  const isCustomer = record.object === "customer";
  const isRevival = record.object === "revival";
  const isCreate = !record.id;
  const isPendingWebLead = Boolean(record.is_pending_web_lead);
  const canUpdateStatus = (isLead || isRevival) && !isCreate;
  const canSchedule = !!record.id;
  const displayIndustry = record.raw?.industry || record.industry || "general";

  const updateProfileField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildLeadPayload = (raw = {}) => {
    const payload = {};
    const name = raw.name || raw.full_name;
    const primaryEmail = raw.primary_email ?? raw.email;
    const primaryPhone = raw.primary_phone ?? raw.phone_number;
    const serviceType = raw.service_type ?? raw.service;
    const leadSource = raw.lead_source ?? raw.source_host;
    const notes = raw.notes ?? raw.message;

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

    if (serviceType !== undefined) payload.service = serviceType;
    if (notes !== undefined) payload.message = notes;
    if (raw.industry_role !== undefined) payload.industry_role = raw.industry_role;
    if (raw.company_name !== undefined) payload.company_name = raw.company_name;
    if (raw.is_business !== undefined) payload.is_business = raw.is_business;
    if (raw.address !== undefined) payload.address = raw.address;
    if (raw.attributes != null) payload.attributes = raw.attributes;
    if (raw.intake_attributes != null) payload.intake_attributes = raw.intake_attributes;
    if (leadSource !== undefined) payload.source_host = leadSource;
    if (raw.recaptcha_score !== undefined) payload.recaptcha_score = raw.recaptcha_score;

    const offering = raw.offering?.id ?? raw.offering;
    if (offering) payload.offering = offering;

    if (raw.priority_score != null) {
      const score = Number(raw.priority_score);
      payload.priority_score = Number.isFinite(score) ? score : raw.priority_score;
    }
    if (raw.summary != null) payload.summary = raw.summary;
    if (raw.tags != null) payload.tags = raw.tags;

    const allowed = new Set([
      "name",
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "primary_email",
      "primary_phone",
      "service",
      "service_type",
      "lead_source",
      "message",
      "notes",
      "industry",
      "industry_role",
      "company_name",
      "is_business",
      "address",
      "attributes",
      "intake_attributes",
      "source_host",
      "recaptcha_score",
      "offering",
      "priority_score",
      "summary",
      "status",
      "tags",
    ]);

    const attributePatch = {};
    Object.entries(formData || {}).forEach(([key, val]) => {
      if (val === undefined || String(val).trim() === "") return;
      if (allowed.has(key)) {
        if (payload[key] === undefined) payload[key] = val;
      } else {
        attributePatch[key] = val;
      }
    });
    if (raw.service_type !== undefined && payload.service === undefined) {
      payload.service = raw.service_type;
    }
    if (raw.lead_source !== undefined && payload.source_host === undefined) {
      payload.source_host = raw.lead_source;
    }
    if (raw.notes !== undefined && payload.message === undefined) {
      payload.message = raw.notes;
    }

    if (
      payload.service !== undefined ||
      payload.source_host !== undefined ||
      payload.message !== undefined ||
      Object.keys(attributePatch).length > 0
    ) {
      const baseAttributes = raw.attributes && typeof raw.attributes === "object" ? raw.attributes : {};
      const leadMetadata = {
        ...(payload.service !== undefined ? { service_type: payload.service } : {}),
        ...(payload.source_host !== undefined ? { lead_source: payload.source_host } : {}),
        ...(payload.message !== undefined ? { notes: payload.message } : {}),
      };
      payload.attributes = {
        ...baseAttributes,
        ...leadMetadata,
        ...attributePatch,
      };
      payload.intake_attributes = {
        ...(raw.intake_attributes && typeof raw.intake_attributes === "object" ? raw.intake_attributes : {}),
        ...leadMetadata,
      };
    }

    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(
        ([, v]) => v !== undefined && v !== null && String(v).trim() !== ""
      )
    );
    return cleaned;
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
      "access_notes",
      "extended_fields",
    ].forEach((key) => {
      if (raw[key] !== undefined) payload[key] = raw[key];
    });

    if (!payload.industry && record.industry) payload.industry = record.industry;
    if (!payload.primary_phone && raw.phone_number) {
      payload.primary_phone = raw.phone_number;
    }
    if (!payload.primary_email && raw.email) {
      payload.primary_email = raw.email;
    }

    const allowed = new Set([
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
      "access_notes",
      "extended_fields",
    ]);
    const extendedFieldsPatch = {};
    Object.entries(formData || {}).forEach(([key, val]) => {
      if (val === undefined || String(val).trim() === "") return;
      if (allowed.has(key)) {
        if (payload[key] === undefined) payload[key] = val;
      } else {
        extendedFieldsPatch[key] = val;
      }
    });
    if (Object.keys(extendedFieldsPatch).length) {
      payload.extended_fields = {
        ...(raw.extended_fields && typeof raw.extended_fields === "object"
          ? raw.extended_fields
          : {}),
        ...extendedFieldsPatch,
      };
    }

    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(
        ([, v]) => v !== undefined && v !== null && String(v).trim() !== ""
      )
    );
    return cleaned;
  };

  /* ---------------------------------------------------------
     SAVE PROFILE
  --------------------------------------------------------- */
  const handleSaveChanges = async () => {
    try {
      const workingData = { ...(record?.raw || {}), ...formData };
      const hasPhone =
        workingData.phone_number ||
        workingData.primary_phone ||
        workingData.secondary_phone;
      const hasEmail =
        workingData.email ||
        workingData.primary_email ||
        workingData.secondary_email;
      if (isCreate) {
        if (isLead) {
          const leadName = (workingData.name || `${workingData.first_name || ""} ${workingData.last_name || ""}`.trim() || "").trim();
          const required = [
            { key: "name", value: leadName },
            { key: "phone", value: workingData.primary_phone || workingData.phone_number },
            { key: "email", value: workingData.primary_email || workingData.email },
            { key: "address", value: workingData.address },
            { key: "service_type", value: workingData.service_type || workingData.service },
            { key: "lead_source", value: workingData.lead_source || workingData.source_host },
            { key: "notes", value: workingData.notes || workingData.message },
          ];
          const missing = required
            .filter((item) => !String(item.value || "").trim())
            .map((item) => item.key);
          if (missing.length > 0) {
            toast.error(`Complete required lead fields: ${missing.join(", ")}`);
            return;
          }
        } else {
          if (!workingData.first_name && !workingData.name) {
            toast.error("First name is required.");
            return;
          }
          if (!workingData.last_name) {
            toast.error("Last name is required.");
            return;
          }
          if (!hasPhone && !hasEmail) {
            toast.error("Provide at least one phone or email.");
            return;
          }
          if (!workingData.address) {
            toast.error("Address is required.");
            return;
          }
        }
      }
      if (isLead) {
        const payload = buildLeadPayload(workingData);
        if (!payload.name) {
          payload.name = [payload.first_name, payload.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
        }
        if (isCreate) {
          const { data } = await api.post("/leads/crm-leads/", payload);
          setRecord(mapEntity(data));
          setFormData(data || {});
          toast.success("Lead created.");
          return;
        }
        if (isPendingWebLead) {
          // Web inbox row that has NOT been forwarded to CRM yet — no CRMLead to PATCH.
          // Create a new CRMLead now, carrying the web lead metadata so the pipeline
          // picks it up, then mark the web lead as handled.
          const { data } = await api.post("/leads/crm-leads/", {
            ...payload,
            source_host: record.raw?.source_host,
            source_table: "forms_generic",
            industry: record.raw?.industry || record.industry || "general",
          });
          if (record.web_lead_id) {
            try {
              await api.post(`/leads/web/${record.web_lead_id}/archive/`);
            } catch {
              // Non-fatal: the CRMLead is created; web row archive can be retried.
            }
          }
          setRecord(mapEntity(data));
          setFormData(data || {});
          toast.success("Lead added to pipeline.");
          return;
        }
        await api.patch(updateUrl, payload);
      } else if (isCustomer) {
        const payload = buildCustomerPayload(workingData);
        if (isCreate) {
          const { data } = await api.post("/customers/", payload);
          setRecord(mapEntity(data));
          setFormData(data || {});
          toast.success("Customer created.");
          return;
        }
        await api.patch(updateUrl, payload);
      } else {
        await api.patch(updateUrl, record.raw);
      }

      const nextRaw = { ...(record?.raw || {}), ...workingData };
      const nextFullName =
        nextRaw.full_name ||
        nextRaw.name ||
        `${nextRaw.first_name || ""} ${nextRaw.last_name || ""}`.trim() ||
        record.full_name;

      setRecord((prev) =>
        prev
          ? {
              ...prev,
              full_name: nextFullName,
              industry: nextRaw.industry || prev.industry,
              raw: nextRaw,
            }
          : prev
      );
      setFormData(nextRaw);
      toast.success("Saved.");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        null;
      toast.error(detail || (isCreate ? "Create failed." : "Save failed."));
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
      setRecord(mapEntity({ ...full.data, object: "customer" }));
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

  /* ---------------------------------------------------------
     TABS
  --------------------------------------------------------- */
  const renderTab = () => {
    const raw = { ...record.raw, object: record.object, industry: record.industry };

    switch (activeTab) {
      case "overview":
        return (
          <InfoTab
            lead={raw}
            formData={formData}
            preferences={preferences}
            onChange={(e) => {
              const { name, value } = e.target;
              updateProfileField(name, value);
            }}
          />
        );
      case "timeline":
        return <TimelineTab record={record} />;
      case "appointments":
        return <AppointmentsTab record={record} />;
      case "work_orders":
        return <WorkOrdersTab record={record} />;
      case "communications":
        return <CommunicationsTab lead={record} />;
      case "invoices":
        return <InvoicesTab record={record} />;
      case "campaigns":
        return <CustomerCampaignsTab record={record} />;
      case "revival":
        return <RevivalTab customer={record} />;
      case "ai_insights":
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
      case "notes":
        return (
          <NotesTab
            record={record}
            formData={formData}
            onFieldChange={updateProfileField}
          />
        );
      case "files":
        return <FilesTab record={record} />;
      default:
        return <div style={{ padding: 20 }}>Unknown</div>;
    }
  };

  /* ---------------------------------------------------------
     JSX
  --------------------------------------------------------- */
  const tabs = [
    { id: "overview", label: "OVERVIEW" },
    { id: "timeline", label: "TIMELINE" },
    { id: "appointments", label: "APPOINTMENTS" },
    { id: "work_orders", label: "WORK ORDERS" },
    { id: "communications", label: "COMMUNICATIONS" },
    { id: "invoices", label: "INVOICES" },
    { id: "campaigns", label: "CAMPAIGNS" },
    { id: "revival", label: "REVIVAL QUOTES" },
    { id: "ai_insights", label: "AI INSIGHTS" },
    { id: "notes", label: "NOTES" },
    { id: "files", label: "FILES" },
  ];
  const nameLabel =
    record.full_name ||
    record.raw?.name ||
    (isLead ? "New Lead" : isRevival ? "Revival" : "New Customer");
  const typeLabel = isLead ? "Lead" : isRevival ? "Revival" : "Customer";
  const statusLabel = record.raw?.status || record.status || "";

  return (
    <div
      className="popup-overlay customer-popup-wrapper"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="popup-container"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="popup-header popup-drag-handle" onMouseDown={handleMouseDown}>
          <div className="header-info">
            <span className="drag-hint" aria-hidden="true">
              <GripHorizontal size={16} />
            </span>
            <div>
              <div className="customer-name">{nameLabel}</div>
              <div className="customer-meta">
                {typeLabel} • {displayIndustry}
                {statusLabel ? ` • ${String(statusLabel).toUpperCase()}` : ""}
              </div>
            </div>
          </div>
          <div className="header-actions">
            {statusLabel && (
              <span className="status-pill">
                {String(statusLabel).toUpperCase()}
              </span>
            )}
            <button
              className="btn-icon"
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-no-drag
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NAV TABS */}
        <div className="popup-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              data-no-drag
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="popup-content">{renderTab()}</div>

        {/* FOOTER */}
        <div className="popup-footer">
          <div className="footer-actions">
            {isLead && convertUrl && !isCreate && (
              <button
                className="btn-ghost"
                onClick={handleConvertToCustomer}
                data-no-drag
              >
                Convert
              </button>
            )}

            <button
              className="btn-ghost"
              onClick={() => {
                onClose?.();
                navigate("/quotes/create", {
                  state: {
                    customer: {
                      id: record?.customer_id || record?.id,
                      customer_id: record?.customer_id || record?.id,
                      first_name: record?.first_name || "",
                      last_name: record?.last_name || "",
                      full_name:
                        record?.full_name ||
                        record?.raw?.name ||
                        [record?.first_name, record?.last_name].filter(Boolean).join(" "),
                      company_name: record?.company_name || "",
                      primary_phone:
                        record?.primary_phone || record?.phone || record?.phone_number || "",
                      primary_email: record?.primary_email || record?.email || "",
                      service_type: record?.service_type || record?.service || "",
                      message: record?.message || record?.notes || "",
                    },
                  },
                });
              }}
              data-no-drag
              title="Create a new quote for this contact"
            >
              + New Quote
            </button>

            <button
              className="btn-ghost"
              onClick={() => setShowScheduleModal(true)}
              disabled={!canSchedule}
              title={!canSchedule ? "Save first to schedule" : undefined}
              data-no-drag
            >
              Schedule
            </button>

            {canUpdateStatus && (
              <button
                className="btn-ghost"
                onClick={() => setShowStatusModal(true)}
                data-no-drag
              >
                Status
              </button>
            )}

            <button className="btn-save" onClick={handleSaveChanges} data-no-drag>
              {isCreate ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* STATUS MODAL */}
      {showStatusModal && canUpdateStatus && (
        <StatusModal
          options={STATUS_OPTIONS}
          onSelect={updateStatus}
          onClose={() => setShowStatusModal(false)}
        />
      )}

      {showScheduleModal && record && (
        <ScheduleModal
          record={record}
          schedulingConfig={schedulingConfig}
          onClose={() => setShowScheduleModal(false)}
        />
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
