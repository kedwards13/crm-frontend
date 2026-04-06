import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarPlus,
  CreditCard,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  X,
} from "lucide-react";

import { getCustomer } from "../../api/customersApi";
import { getOperationalCustomer } from "../../api/operationsCustomersApi";
import { mapEntity } from "../../utils/contactMapper";
import { getIndustryKey, getSchedulingConfig } from "../../constants/uiRegistry";
import GoogleMapsEmbed from "../GoogleMapsEmbed";
import ServicePlansTab from "./components/ServicePlansTab";
import OperationalAppointmentsTab from "./components/OperationalAppointmentsTab";
import OperationalPaymentsTab from "./components/OperationalPaymentsTab";
import OperationalServicePlansTab from "./components/OperationalServicePlansTab";
import AppointmentsTab from "../Profile/ProfileTabs/AppointmentsTab";
import InvoicesTab from "../Profile/ProfileTabs/InvoicesTab";
import TimelineTab from "../Profile/ProfileTabs/TimelineTab";
import CommunicationsTab from "../Profile/ProfileTabs/CommunicationsTab";
import RevivalTab from "../Profile/ProfileTabs/RevivalTab";
import ScheduleModal from "./Modals/ScheduleModal";
import Badge from "../ui/badge";
import "./CustomerDetailPage.css";

const TABS = [
  { key: "timeline", label: "Timeline" },
  { key: "appointments", label: "Appointments" },
  { key: "agreements", label: "Agreements" },
  { key: "communications", label: "Communications" },
  { key: "invoices", label: "Invoices" },
];

const EMPTY_VALUE = "—";

const clean = (value) => String(value || "").trim();
const digits = (value) => String(value || "").replace(/\D/g, "");

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return EMPTY_VALUE;
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const formatAge = (value) => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (diffDays < 30) return `${diffDays}d`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
  return `${Math.floor(diffDays / 365)}y`;
};

const asAddress = (value) => {
  if (!value) return "";
  if (typeof value === "string") return clean(value);
  return [
    value.address || value.line1 || value.street,
    [value.city, value.state].filter(Boolean).join(", "),
    value.zip || value.postal_code,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const pickFirst = (...values) => values.find((value) => clean(value));

const prettyLabel = (value) =>
  clean(value)
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const getStatusBadge = (status) => {
  const normalized = clean(status).toLowerCase();
  if (!normalized) return { label: "Unknown", color: "gray" };
  if (["active", "current", "accepted", "completed"].includes(normalized)) {
    return { label: prettyLabel(normalized), color: "emerald" };
  }
  if (["paused", "pending", "sent", "scheduled"].includes(normalized)) {
    return { label: prettyLabel(normalized), color: "yellow" };
  }
  if (["inactive", "canceled", "cancelled", "rejected", "delinquent", "past_due"].includes(normalized)) {
    return { label: prettyLabel(normalized), color: "red" };
  }
  return { label: prettyLabel(normalized), color: "blue" };
};

const getPaymentBadge = ({ openBalance, autopayEnabled, invoiceCount }) => {
  if (Number(openBalance || 0) > 0) return { label: "Balance due", color: "red" };
  if (autopayEnabled) return { label: "Autopay", color: "emerald" };
  if (Number(invoiceCount || 0) > 0) return { label: "Current", color: "blue" };
  return { label: "No invoices", color: "gray" };
};

const resolveFieldRoutesId = (customer, operationalSummary) =>
  pickFirst(
    operationalSummary?.external_id,
    operationalSummary?.fieldroutes_customer_id,
    customer?.fieldroutes_customer_id,
    customer?.external_id,
    customer?.extended_fields?.fieldroutes?.external_id,
    customer?.extended_fields?.fieldroutes?.customer_id
  );

const buildMergedCustomer = (customer, operationalSummary) => {
  if (!customer && !operationalSummary) return null;

  const fieldroutes = customer?.extended_fields?.fieldroutes || {};
  const serviceAddress = {
    ...(fieldroutes.service_address || {}),
    address: pickFirst(fieldroutes.service_address?.address, operationalSummary?.service_address, customer?.address),
    city: pickFirst(fieldroutes.service_address?.city, operationalSummary?.city, customer?.city),
    state: pickFirst(fieldroutes.service_address?.state, operationalSummary?.state, customer?.state),
    zip: pickFirst(fieldroutes.service_address?.zip, operationalSummary?.zip, customer?.zip_code),
  };

  return {
    ...(customer || {}),
    object: "customer",
    id: customer?.id || operationalSummary?.crm_customer_id || operationalSummary?.external_id,
    customer_id:
      customer?.customer_id || customer?.id || operationalSummary?.crm_customer_id || operationalSummary?.external_id,
    full_name: pickFirst(customer?.full_name, operationalSummary?.customer_name, customer?.company_name, "Customer"),
    primary_phone: pickFirst(customer?.primary_phone, operationalSummary?.primary_phone, operationalSummary?.billing_phone),
    primary_email: pickFirst(customer?.primary_email, operationalSummary?.primary_email, operationalSummary?.billing_email),
    address: pickFirst(customer?.address, operationalSummary?.service_address),
    city: pickFirst(customer?.city, operationalSummary?.city),
    state: pickFirst(customer?.state, operationalSummary?.state),
    zip_code: pickFirst(customer?.zip_code, operationalSummary?.zip),
    outstanding_balance: customer?.outstanding_balance ?? operationalSummary?.balance,
    invoice_count: customer?.invoice_count ?? operationalSummary?.payments_total,
    extended_fields: {
      ...(customer?.extended_fields || {}),
      fieldroutes: {
        ...fieldroutes,
        external_id: resolveFieldRoutesId(customer, operationalSummary),
        balance: operationalSummary?.balance ?? fieldroutes.balance,
        account_status: pickFirst(operationalSummary?.account_status, operationalSummary?.status, fieldroutes.account_status),
        is_active: operationalSummary?.is_active ?? fieldroutes.is_active,
        service_address: serviceAddress,
        billing_contact: {
          ...(fieldroutes.billing_contact || {}),
          company_name: pickFirst(fieldroutes.billing_contact?.company_name, operationalSummary?.billing_name),
          phone: pickFirst(fieldroutes.billing_contact?.phone, operationalSummary?.billing_phone),
          email: pickFirst(fieldroutes.billing_contact?.email, operationalSummary?.billing_email),
        },
        autopay_enabled: operationalSummary?.autopay_enabled ?? fieldroutes.autopay_enabled,
        autopay_method: pickFirst(operationalSummary?.autopay_method, fieldroutes.autopay_method),
        plan_count: operationalSummary?.plan_count ?? fieldroutes.plan_count,
        active_plan_count: operationalSummary?.active_plan_count ?? fieldroutes.active_plan_count,
        next_service_at: pickFirst(operationalSummary?.next_service_at, fieldroutes.next_service_at),
        last_service_at: pickFirst(operationalSummary?.last_service_at, fieldroutes.last_service_at),
      },
    },
    raw: {
      ...(customer || {}),
    },
  };
};

function FactItem({ label, value }) {
  return (
    <div className="cdp-fact">
      <span>{label}</span>
      <strong>{clean(value) || EMPTY_VALUE}</strong>
    </div>
  );
}

function TabPanel({ children }) {
  return <div className="cdp-tab-panel">{children}</div>;
}

export default function CustomerDetailPage() {
  const { customerId, externalId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState(null);
  const [operationalSummary, setOperationalSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [showSchedule, setShowSchedule] = useState(false);

  const industryKey = getIndustryKey("general");
  const schedulingConfig = getSchedulingConfig(industryKey);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (externalId) {
          const operationalResponse = await getOperationalCustomer(externalId);
          const summary = operationalResponse?.data || null;
          if (!mounted) return;
          setOperationalSummary(summary);

          const crmId = summary?.crm_customer_id;
          if (crmId) {
            try {
              const customerResponse = await getCustomer(crmId);
              if (!mounted) return;
              setCustomer(customerResponse?.data || null);
            } catch (customerError) {
              if (!mounted) return;
              setCustomer(null);
              setError(customerError?.response?.data?.detail || customerError?.message || "Unable to load CRM customer.");
            }
          } else {
            setCustomer(null);
          }
          return;
        }

        const customerResponse = await getCustomer(customerId);
        const nextCustomer = customerResponse?.data || null;
        if (!mounted) return;
        setCustomer(nextCustomer);

        const fieldroutesId = resolveFieldRoutesId(nextCustomer, null);
        if (fieldroutesId) {
          try {
            const operationalResponse = await getOperationalCustomer(fieldroutesId);
            if (!mounted) return;
            setOperationalSummary(operationalResponse?.data || null);
          } catch {
            if (!mounted) return;
            setOperationalSummary(null);
          }
        } else {
          setOperationalSummary(null);
        }
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.response?.data?.detail || loadError?.message || "Unable to load customer.");
        setCustomer(null);
        setOperationalSummary(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [customerId, externalId]);

  const mergedCustomer = useMemo(
    () => buildMergedCustomer(customer, operationalSummary),
    [customer, operationalSummary]
  );

  const record = useMemo(() => {
    if (!mergedCustomer && !operationalSummary) return null;
    if (mergedCustomer) return mapEntity(mergedCustomer);

    return mapEntity({
      object: "customer",
      id: operationalSummary?.crm_customer_id || operationalSummary?.external_id,
      customer_id: operationalSummary?.crm_customer_id || operationalSummary?.external_id,
      full_name: operationalSummary?.customer_name,
      primary_phone: operationalSummary?.primary_phone,
      primary_email: operationalSummary?.primary_email,
      address: operationalSummary?.service_address,
      city: operationalSummary?.city,
      state: operationalSummary?.state,
      zip_code: operationalSummary?.zip,
      external_id: operationalSummary?.external_id,
    });
  }, [mergedCustomer, operationalSummary]);

  const fieldroutesId = useMemo(
    () => resolveFieldRoutesId(customer, operationalSummary),
    [customer, operationalSummary]
  );

  const address = useMemo(
    () =>
      asAddress(
        mergedCustomer?.extended_fields?.fieldroutes?.service_address ||
          mergedCustomer ||
          operationalSummary?.service_address
      ) || asAddress(operationalSummary?.service_address),
    [mergedCustomer, operationalSummary]
  );

  const primaryPhone = pickFirst(
    mergedCustomer?.primary_phone,
    operationalSummary?.primary_phone,
    operationalSummary?.billing_phone
  );
  const customerName = pickFirst(mergedCustomer?.full_name, operationalSummary?.customer_name, "Customer");
  const customerStatus = getStatusBadge(
    pickFirst(
      operationalSummary?.account_status,
      operationalSummary?.status,
      mergedCustomer?.pipeline_stage,
      mergedCustomer?.extended_fields?.fieldroutes?.account_status
    )
  );
  const nextService = pickFirst(
    operationalSummary?.next_service_at,
    mergedCustomer?.extended_fields?.fieldroutes?.next_service_at
  );
  const lastService = pickFirst(
    operationalSummary?.last_service_at,
    mergedCustomer?.extended_fields?.fieldroutes?.last_service_at
  );
  const openBalance = Number(
    mergedCustomer?.outstanding_balance ??
      mergedCustomer?.extended_fields?.fieldroutes?.balance ??
      operationalSummary?.balance ??
      0
  );
  const paymentStatus = getPaymentBadge({
    openBalance,
    autopayEnabled:
      operationalSummary?.autopay_enabled ?? mergedCustomer?.extended_fields?.fieldroutes?.autopay_enabled,
    invoiceCount: mergedCustomer?.invoice_count ?? operationalSummary?.payments_total,
  });
  const contractValue = pickFirst(
    operationalSummary?.contract_value,
    operationalSummary?.total_contract_value,
    mergedCustomer?.contract_value,
    mergedCustomer?.lifetime_value
  );
  const customerAge = formatAge(
    pickFirst(
      mergedCustomer?.created_at,
      mergedCustomer?.raw?.created_at,
      operationalSummary?.created_at
    )
  );
  const servicePlanLabel = clean(
    pickFirst(
      operationalSummary?.plan_name,
      operationalSummary?.service_plan,
      operationalSummary?.plan_count ? `${operationalSummary.plan_count} plans` : "",
      mergedCustomer?.service_plan_name,
      mergedCustomer?.extended_fields?.fieldroutes?.plan_count
        ? `${mergedCustomer.extended_fields.fieldroutes.plan_count} plans`
        : ""
    )
  );
  const techAssigned = pickFirst(
    operationalSummary?.technician_name,
    operationalSummary?.assigned_technician_name,
    mergedCustomer?.assigned_technician_name,
    mergedCustomer?.account_manager_name
  );
  const agreementStatus = pickFirst(
    operationalSummary?.account_status,
    operationalSummary?.status,
    mergedCustomer?.extended_fields?.fieldroutes?.account_status
  );

  const primaryEmail = pickFirst(
    mergedCustomer?.primary_email,
    operationalSummary?.primary_email,
    operationalSummary?.billing_email
  );
  const customerSince = pickFirst(
    mergedCustomer?.created_at,
    mergedCustomer?.raw?.created_at,
    operationalSummary?.created_at
  );
  const billingContact = mergedCustomer?.extended_fields?.fieldroutes?.billing_contact;
  const billingName = clean(billingContact?.company_name);
  const billingEmail = clean(billingContact?.email);
  const billingPhone = clean(billingContact?.phone);

  const commQuery = useMemo(() => {
    const params = new URLSearchParams();
    const partyId = record?.universal_id || record?.raw?.universal_id;
    const crmCustomerId = mergedCustomer?.customer_id || mergedCustomer?.id || operationalSummary?.crm_customer_id;
    const normalizedNumber = digits(primaryPhone);

    if (partyId) params.set("party_universal_id", partyId);
    if (crmCustomerId) params.set("customer_id", crmCustomerId);
    if (normalizedNumber.length >= 10) params.set("target_number", `+1${normalizedNumber.slice(-10)}`);
    if (customerName) params.set("name", customerName);

    return params.toString();
  }, [customerName, mergedCustomer, operationalSummary, primaryPhone, record]);

  const content = useMemo(() => {
    if (!record && !operationalSummary) return null;

    if (activeTab === "timeline") {
      return (
        <TabPanel>
          <TimelineTab record={record} />
        </TabPanel>
      );
    }

    if (activeTab === "appointments") {
      return (
        <TabPanel>
          {fieldroutesId ? (
            <OperationalAppointmentsTab fieldroutesCustomerId={fieldroutesId} />
          ) : (
            <AppointmentsTab record={record} />
          )}
        </TabPanel>
      );
    }

    if (activeTab === "agreements") {
      return (
        <div className="cdp-tab-stack">
          <TabPanel>
            <div className="cdp-tab-heading">
              <div>
                <h3>Agreements</h3>
                <p>Recurring subscriptions, contract value, sold date, and rep ownership.</p>
              </div>
            </div>
            {fieldroutesId ? (
              <OperationalServicePlansTab fieldroutesCustomerId={fieldroutesId} />
            ) : (
              <ServicePlansTab customer={mergedCustomer || record} />
            )}
          </TabPanel>
          <TabPanel>
            <div className="cdp-tab-heading">
              <div>
                <h3>Quotes</h3>
                <p>One-time estimates remain available in the same operator surface.</p>
              </div>
            </div>
            <RevivalTab customer={mergedCustomer || record} />
          </TabPanel>
        </div>
      );
    }

    if (activeTab === "communications") {
      return (
        <TabPanel>
          <CommunicationsTab customer={record} />
        </TabPanel>
      );
    }

    if (activeTab === "invoices") {
      return (
        <div className="cdp-tab-stack">
          {record ? (
            <TabPanel>
              <div className="cdp-tab-heading">
                <div>
                  <h3>CRM Invoices</h3>
                  <p>Invoice and payment history already stored in the CRM backend.</p>
                </div>
              </div>
              <InvoicesTab record={record} />
            </TabPanel>
          ) : null}
          {fieldroutesId ? (
            <TabPanel>
              <div className="cdp-tab-heading">
                <div>
                  <h3>Operational Payments</h3>
                  <p>FieldRoutes payment records remain visible in the same modal.</p>
                </div>
              </div>
              <OperationalPaymentsTab fieldroutesCustomerId={fieldroutesId} />
            </TabPanel>
          ) : null}
        </div>
      );
    }

    return null;
  }, [activeTab, fieldroutesId, mergedCustomer, operationalSummary, record]);

  if (loading) {
    return (
      <div className="cdp-shell">
        <div className="cdp-overlay" />
        <div className="cdp-modal-card cdp-state-card">Loading customer…</div>
      </div>
    );
  }

  if (error && !mergedCustomer && !operationalSummary) {
    return (
      <div className="cdp-shell">
        <div className="cdp-overlay" />
        <div className="cdp-modal-card cdp-state-card">
          <div className="cdp-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!mergedCustomer && !operationalSummary) {
    return (
      <div className="cdp-shell">
        <div className="cdp-overlay" />
        <div className="cdp-modal-card cdp-state-card">
          <div className="cdp-error">Customer not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cdp-shell">
      <div className="cdp-overlay" />
      <section className="cdp-modal-card">
        <header className="cdp-header-card">
          <div className="cdp-title-row">
            <div className="cdp-title-block">
              <h1>{customerName}</h1>
              <Badge color={customerStatus.color}>{customerStatus.label}</Badge>
            </div>
            <button type="button" className="cdp-close" onClick={() => navigate("/customers/list")} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="cdp-header-meta">
            <span><MapPin size={14} /> {address || EMPTY_VALUE}</span>
            <span><Phone size={14} /> {primaryPhone || EMPTY_VALUE}</span>
            {primaryEmail ? <span><Mail size={14} /> {primaryEmail}</span> : null}
            <span>Payment <Badge color={paymentStatus.color}>{paymentStatus.label}</Badge></span>
            <span>Next {formatDate(nextService)}</span>
            <span>Last {formatDate(lastService)}</span>
            {customerSince ? <span>Customer since {formatDate(customerSince)}</span> : null}
          </div>
          {error ? <div className="cdp-inline-warning">{error}</div> : null}
        </header>

        <div className="cdp-action-bar" role="toolbar" aria-label="Customer actions">
          <button
            type="button"
            className="cdp-action-btn"
            onClick={() => navigate(`/communication/dialer${commQuery ? `?${commQuery}` : ""}`)}
            disabled={!primaryPhone}
          >
            <Phone size={16} />
            Call
          </button>
          <button
            type="button"
            className="cdp-action-btn"
            onClick={() => navigate(`/communication/sms${commQuery ? `?${commQuery}` : ""}`)}
            disabled={!primaryPhone && !record?.universal_id}
          >
            <MessageSquareText size={16} />
            Text
          </button>
          {primaryEmail ? (
            <button
              type="button"
              className="cdp-action-btn"
              onClick={() => navigate(`/communication/email${commQuery ? `?${commQuery}` : ""}`)}
            >
              <Mail size={16} />
              Email
            </button>
          ) : null}
          <button
            type="button"
            className="cdp-action-btn cdp-action-btn-primary"
            onClick={() => {
              setShowSchedule(true);
              setActiveTab("appointments");
            }}
          >
            <CalendarPlus size={16} />
            Schedule
          </button>
          <button type="button" className="cdp-action-btn" onClick={() => setActiveTab("invoices")}>
            <CreditCard size={16} />
            Take Payment
          </button>
        </div>

        <div className="cdp-modal-body">
          <section className="cdp-main-grid">
            <div className="cdp-left-column">
              <div className="cdp-summary-card">
                <div className="cdp-section-head">
                  <h3>Service & Revenue</h3>
                </div>
                <div className="cdp-facts-grid">
                  <FactItem label="Service plan" value={servicePlanLabel || EMPTY_VALUE} />
                  <FactItem label="Contract value" value={contractValue ? formatMoney(contractValue) : EMPTY_VALUE} />
                  <FactItem label="Customer age" value={customerAge} />
                  <FactItem label="Tech assigned" value={techAssigned || EMPTY_VALUE} />
                  <FactItem label="Open balance" value={formatMoney(openBalance)} />
                  <FactItem label="Agreement status" value={agreementStatus || EMPTY_VALUE} />
                  {billingName ? <FactItem label="Billing contact" value={billingName} /> : null}
                  {billingEmail ? <FactItem label="Billing email" value={billingEmail} /> : null}
                  {billingPhone ? <FactItem label="Billing phone" value={billingPhone} /> : null}
                </div>
              </div>
            </div>

            <aside className="cdp-map-card">
              {address ? (
                <div className="cdp-map-frame">
                  <GoogleMapsEmbed address={address} height="100%" />
                </div>
              ) : (
                <div className="cdp-empty-card cdp-map-empty">
                  <h3>Map unavailable</h3>
                  <p>Add a valid service address to unlock map context.</p>
                </div>
              )}
            </aside>
          </section>

          <nav className="cdp-tabs" aria-label="Customer navigation">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`cdp-tab ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="cdp-body">{content}</div>
        </div>
      </section>

      {showSchedule ? (
        <div className="cdp-modal">
          <div className="cdp-modal-surface" role="dialog" aria-modal="true">
            <ScheduleModal
              record={record}
              schedulingConfig={schedulingConfig}
              onClose={() => setShowSchedule(false)}
            />
          </div>
          <button className="cdp-modal-backdrop" onClick={() => setShowSchedule(false)} aria-label="Close" />
        </div>
      ) : null}
    </div>
  );
}
