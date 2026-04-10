import React, { memo, useMemo, useState } from "react";
import StreetViewEmbed from "../../../utils/StreetViewEmbed";
import { toast } from "react-toastify";
import { enrichCustomer } from "../../../api/customersApi";
import { getIndustry } from "../../../helpers/tenantHelpers";
import { getIndustryUIConfig } from "../../../constants/industryUIRegistry";
import {
  extractOrderCollections,
  summarizeOrders,
  extractConstraints,
  getOrderIdLabel,
  getOrderDateValue,
  formatShortDate,
  getOrderAmountValue,
  formatCurrency,
} from "../../../utils/orderUtils";
import "./Info-tab.css";

function readFieldValue(entity, name, fallback = "") {
  if (!entity || !name) return fallback ?? "";

  const candidates = [
    entity[name],
    entity.extended_fields?.[name],
    entity.attributes?.[name],
    entity.intake_attributes?.[name],
  ];

  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback ?? "";
}

function cleanText(value) {
  return String(value || "").trim();
}

function buildAddressQuery(entity) {
  const street = cleanText(readFieldValue(entity, "address"));
  const city = cleanText(readFieldValue(entity, "city"));
  const state = cleanText(readFieldValue(entity, "state"));
  const zip = cleanText(readFieldValue(entity, "zip_code"));
  const county = cleanText(readFieldValue(entity, "county"));
  const country = cleanText(readFieldValue(entity, "country"));

  const locality = [city, state, zip].filter(Boolean).join(" ");
  return [street, locality, county, country].filter(Boolean).join(", ");
}

const InfoField = memo(function InfoField({
  label,
  name,
  value,
  onValueChange,
  type = "text",
  textarea = false,
  className = "",
  options,
}) {
  return (
    <div className={`info-field ${className}`.trim()}>
      <label className="info-label" htmlFor={`field-${name}`}>
        {label}
      </label>

      {options ? (
        <select
          id={`field-${name}`}
          className="info-input"
          value={value}
          onChange={(event) => onValueChange(name, event.target.value)}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option
              key={option.value || option}
              value={option.value || option}
            >
              {option.label || option}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          id={`field-${name}`}
          className="info-input info-textarea"
          value={value}
          onChange={(event) => onValueChange(name, event.target.value)}
        />
      ) : (
        <input
          id={`field-${name}`}
          type={type}
          className="info-input"
          value={value}
          onChange={(event) => onValueChange(name, event.target.value)}
        />
      )}
    </div>
  );
});

const InfoMapPanel = memo(function InfoMapPanel({ addressQuery }) {
  if (!addressQuery) {
    return (
      <div className="info-map-empty">
        Add the property address to preview the location.
      </div>
    );
  }

  return <StreetViewEmbed address={addressQuery} />;
});

export default function InfoTab({ lead, formData = {}, onChange, preferences }) {
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  const safeLead = useMemo(
    () => ({ ...(lead || {}), ...(formData || {}) }),
    [lead, formData]
  );
  const isLoading = !lead;

  const isCustomer =
    safeLead.object === "customer" || safeLead.customer_id != null;
  const tenantIndustry =
    preferences?.industry || safeLead.industry || getIndustry("general");
  const uiConfig = getIndustryUIConfig(tenantIndustry, safeLead);
  const { orders, history } = useMemo(
    () => extractOrderCollections(safeLead),
    [safeLead]
  );
  const orderSummary = useMemo(() => {
    const source = orders.length ? orders : history;
    return summarizeOrders(source);
  }, [orders, history]);
  const constraints = useMemo(() => extractConstraints(safeLead), [safeLead]);
  const rawNotes =
    readFieldValue(safeLead, "notes") ||
    readFieldValue(safeLead, "special_instructions") ||
    readFieldValue(safeLead, "delivery_notes") ||
    readFieldValue(safeLead, "instructions");
  const opsNotes = Array.isArray(rawNotes)
    ? rawNotes.filter(Boolean).join(", ")
    : typeof rawNotes === "string"
    ? rawNotes
    : "";
  const hasConstraints =
    constraints.allergies.length > 0 || constraints.dietary.length > 0;
  const historyOrders =
    history.length > 0 ? history : orderSummary.buckets.Fulfilled || [];
  const showOrderOps =
    isCustomer &&
    uiConfig.primaryObject === "orders" &&
    (orders.length > 0 ||
      historyOrders.length > 0 ||
      hasConstraints ||
      Boolean(opsNotes));

  const upcomingDates = useMemo(() => {
    const upcoming = [
      ...orderSummary.buckets.Draft,
      ...orderSummary.buckets.Scheduled,
    ];
    const dates = upcoming
      .map((order) => getOrderDateValue(order))
      .filter(Boolean)
      .map((val) => new Date(val))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    return dates;
  }, [orderSummary.buckets]);

  const dynamicFields = useMemo(() => {
    const overrides =
      preferences?.ai_mapping_overrides?.lead_form ||
      preferences?.ai_mapping_overrides?.customer_form ||
      preferences?.ai_mapping_overrides?.customer_import ||
      {};
    return Object.entries(overrides).map(([label, name]) => ({
      label,
      name,
    }));
  }, [preferences]);

  const addressQuery = useMemo(() => buildAddressQuery(safeLead), [safeLead]);
  const leadNotes = cleanText(
    readFieldValue(safeLead, "notes", readFieldValue(safeLead, "message"))
  );
  const leadSummary = cleanText(readFieldValue(safeLead, "summary"));
  const leadStatus = cleanText(readFieldValue(safeLead, "status", "new"));
  const leadAttribution = useMemo(() => {
    const raw = safeLead?.attributes?.attribution;
    return raw && typeof raw === "object" ? raw : null;
  }, [safeLead]);
  const mapHref = addressQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        addressQuery
      )}`
    : "";

  const updateField = (field, value) => {
    onChange?.({ target: { name: field, value } });
  };

  const IndustryFields = () => {
    switch (safeLead.industry) {
      case "landscaping":
        return (
          <>
            <InfoField
              label="Project Type"
              name="project_type"
              value={readFieldValue(safeLead, "project_type")}
              onValueChange={updateField}
            />
            <InfoField
              label="Square Footage"
              name="square_footage"
              value={readFieldValue(safeLead, "square_footage")}
              onValueChange={updateField}
            />
            <InfoField
              label="Budget"
              name="budget"
              value={readFieldValue(safeLead, "budget")}
              onValueChange={updateField}
            />
            <InfoField
              label="Deadline"
              name="deadline"
              value={readFieldValue(safeLead, "deadline")}
              onValueChange={updateField}
            />
          </>
        );

      case "pest":
      case "pest_control":
        return (
          <>
            <InfoField
              label="Service Type"
              name="service_type"
              value={readFieldValue(
                safeLead,
                "service_type",
                readFieldValue(safeLead, "service")
              )}
              onValueChange={updateField}
            />
            <InfoField
              label="Irrigation Type"
              name="irrigation_type"
              value={readFieldValue(safeLead, "irrigation_type")}
              onValueChange={updateField}
            />
            <InfoField
              label="Last Treatment"
              name="last_treatment"
              value={readFieldValue(safeLead, "last_treatment")}
              onValueChange={updateField}
            />
            <InfoField
              label="Notes"
              name="notes"
              value={readFieldValue(
                safeLead,
                "notes",
                readFieldValue(safeLead, "message")
              )}
              onValueChange={updateField}
              textarea
            />
          </>
        );

      case "cleaning":
        return (
          <>
            <InfoField
              label="Cleaning Type"
              name="cleaning_type"
              value={readFieldValue(safeLead, "cleaning_type")}
              onValueChange={updateField}
            />
            <InfoField
              label="Frequency"
              name="frequency"
              value={readFieldValue(safeLead, "frequency")}
              onValueChange={updateField}
            />
            <InfoField
              label="Pets"
              name="pets"
              value={readFieldValue(safeLead, "pets")}
              onValueChange={updateField}
            />
            <InfoField
              label="Notes"
              name="notes"
              value={readFieldValue(
                safeLead,
                "notes",
                readFieldValue(safeLead, "message")
              )}
              onValueChange={updateField}
              textarea
            />
          </>
        );

      case "real_estate":
        return (
          <>
            <InfoField
              label="Property Type"
              name="property_type"
              value={readFieldValue(safeLead, "property_type")}
              onValueChange={updateField}
            />
            <InfoField
              label="Bedrooms"
              type="number"
              name="number_of_bedrooms"
              value={readFieldValue(safeLead, "number_of_bedrooms")}
              onValueChange={updateField}
            />
            <InfoField
              label="Bathrooms"
              type="number"
              name="number_of_bathrooms"
              value={readFieldValue(safeLead, "number_of_bathrooms")}
              onValueChange={updateField}
            />
            <InfoField
              label="Condition"
              name="condition"
              value={readFieldValue(safeLead, "condition")}
              onValueChange={updateField}
            />
          </>
        );

      default:
        return <div className="info-none">No additional fields.</div>;
    }
  };

  const runEnrichment = async () => {
    if (!isCustomer) return toast.info("Convert to customer first.");

    try {
      setLoadingEnrich(true);
      const res = await enrichCustomer(safeLead.customer_id || safeLead.id);
      const data = res?.data || {};
      setLoadingEnrich(false);

      if (data?.error) return toast.error(data.error || "Enrichment failed.");
      toast.success("Enrichment complete.");
    } catch (err) {
      setLoadingEnrich(false);
      toast.error("Enrichment error.");
    }
  };

  if (isLoading) {
    return <div className="info-empty">Loading...</div>;
  }

  if (safeLead.object === "lead") {
    const statusOptions = [
      { value: "new", label: "New" },
      { value: "contacted", label: "Contacted" },
      { value: "qualified", label: "Qualified" },
      { value: "scheduled", label: "Scheduled" },
      { value: "closed", label: "Closed" },
      { value: "dead", label: "Dead" },
    ];

    return (
      <div className="info-tab">
        <div className="info-main-row info-main-row--lead">
          <div className="info-main-left">
            <div className="info-group info-group--dense">
              <div className="info-section-header">
                <div>
                  <div className="info-section-eyebrow">Lead record</div>
                  <div className="info-section-title">Customer Information</div>
                </div>
                <span className="info-status-chip">
                  {leadStatus ? leadStatus.toUpperCase() : "NEW"}
                </span>
              </div>

              <div className="info-grid-2 info-grid-tight">
                <InfoField
                  label="First Name"
                  name="first_name"
                  value={readFieldValue(safeLead, "first_name")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Last Name"
                  name="last_name"
                  value={readFieldValue(safeLead, "last_name")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Company Name"
                  name="company_name"
                  value={readFieldValue(safeLead, "company_name")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Primary Phone"
                  name="primary_phone"
                  type="tel"
                  value={readFieldValue(
                    safeLead,
                    "primary_phone",
                    readFieldValue(safeLead, "phone_number")
                  )}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Primary Email"
                  name="primary_email"
                  type="email"
                  value={readFieldValue(
                    safeLead,
                    "primary_email",
                    readFieldValue(safeLead, "email")
                  )}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Service Type"
                  name="service_type"
                  value={readFieldValue(
                    safeLead,
                    "service_type",
                    readFieldValue(safeLead, "service")
                  )}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Lead Source"
                  name="lead_source"
                  value={readFieldValue(
                    safeLead,
                    "lead_source",
                    readFieldValue(safeLead, "source_host")
                  )}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Industry"
                  name="industry"
                  value={readFieldValue(safeLead, "industry")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Status"
                  name="status"
                  value={readFieldValue(safeLead, "status")}
                  onValueChange={updateField}
                  options={statusOptions}
                />
              </div>
            </div>

            <div className="info-group info-group--dense">
              <div className="info-section-header">
                <div>
                  <div className="info-section-eyebrow">Lead context</div>
                  <div className="info-section-title">Notes & Summary</div>
                </div>
              </div>

              <div className="info-grid-2 info-grid-tight">
                <InfoField
                  label="Priority Score"
                  name="priority_score"
                  type="number"
                  value={readFieldValue(safeLead, "priority_score")}
                  onValueChange={updateField}
                />
                <div className="info-stat-card">
                  <span className="info-stat-label">Created</span>
                  <strong className="info-stat-value">
                    {safeLead.created_at
                      ? formatShortDate(safeLead.created_at)
                      : "Unknown"}
                  </strong>
                </div>
                <InfoField
                  label="Message"
                  name="notes"
                  textarea
                  className="field-wide"
                  value={leadNotes}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Summary"
                  name="summary"
                  textarea
                  className="field-wide"
                  value={leadSummary}
                  onValueChange={updateField}
                />
              </div>
            </div>

            <div className="info-group info-group--dense">
              <div className="info-section-header">
                <div>
                  <div className="info-section-eyebrow">Revenue loop</div>
                  <div className="info-section-title">Revenue Attribution</div>
                </div>
              </div>

              <div className="info-grid-2 info-grid-tight">
                <div className="info-stat-card">
                  <span className="info-stat-label">Revenue</span>
                  <strong className="info-stat-value">
                    {formatCurrency(Number(leadAttribution?.revenue_total || 0))}
                  </strong>
                </div>
                <div className="info-stat-card">
                  <span className="info-stat-label">Outstanding</span>
                  <strong className="info-stat-value">
                    {formatCurrency(Number(leadAttribution?.outstanding_balance || 0))}
                  </strong>
                </div>
                <div className="info-stat-card">
                  <span className="info-stat-label">Jobs</span>
                  <strong className="info-stat-value">
                    {Number(leadAttribution?.jobs_count || 0)}
                  </strong>
                </div>
                <div className="info-stat-card">
                  <span className="info-stat-label">Paid Invoices</span>
                  <strong className="info-stat-value">
                    {Number(leadAttribution?.paid_invoices || 0)}
                  </strong>
                </div>
                <div className="info-stat-card">
                  <span className="info-stat-label">Last Service</span>
                  <strong className="info-stat-value">
                    {leadAttribution?.last_service_date
                      ? formatShortDate(leadAttribution.last_service_date)
                      : "—"}
                  </strong>
                </div>
                <div className="info-stat-card">
                  <span className="info-stat-label">Service Frequency</span>
                  <strong className="info-stat-value">
                    {cleanText(leadAttribution?.service_frequency) || "—"}
                  </strong>
                </div>
                <div className="info-stat-card field-wide">
                  <span className="info-stat-label">CLV Estimate</span>
                  <strong className="info-stat-value">
                    {formatCurrency(Number(leadAttribution?.clv_estimate || 0))}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="info-main-right">
            <div className="info-group info-group--dense info-address-group">
              <div className="info-section-header">
                <div>
                  <div className="info-section-eyebrow">Property</div>
                  <div className="info-section-title">Address & Map</div>
                </div>
                {mapHref ? (
                  <a
                    className="info-map-link"
                    href={mapHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Maps
                  </a>
                ) : null}
              </div>

              <div className="info-grid-address-top">
                <InfoField
                  label="Street Address"
                  name="address"
                  className="field-wide"
                  value={readFieldValue(safeLead, "address")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Zip"
                  name="zip_code"
                  value={readFieldValue(safeLead, "zip_code")}
                  onValueChange={updateField}
                />
              </div>

              <div className="info-grid-4 info-grid-tight">
                <InfoField
                  label="City"
                  name="city"
                  value={readFieldValue(safeLead, "city")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="State"
                  name="state"
                  value={readFieldValue(safeLead, "state")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="County"
                  name="county"
                  value={readFieldValue(safeLead, "county")}
                  onValueChange={updateField}
                />
                <InfoField
                  label="Country"
                  name="country"
                  value={readFieldValue(safeLead, "country", "United States")}
                  onValueChange={updateField}
                />
              </div>

              <div className="info-map">
                <InfoMapPanel addressQuery={addressQuery} />
              </div>
            </div>
          </div>
        </div>

        {dynamicFields.length > 0 ? (
          <div className="info-secondary-row">
            <div className="info-group info-group--dense info-secondary-single">
              <div className="info-section-header">
                <div>
                  <div className="info-section-eyebrow">Extended fields</div>
                  <div className="info-section-title">Additional Details</div>
                </div>
              </div>
              <div className="info-grid-3 industry-grid">
                {dynamicFields.map((field) => (
                  <InfoField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    value={readFieldValue(safeLead, field.name)}
                    onValueChange={updateField}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="info-tab">
      {showOrderOps && (
        <div className="info-group ops-summary">
          <div className="ops-header">
            <div>
              <div className="info-section-title">Operations Summary</div>
              <div className="ops-title">
                {safeLead.full_name || safeLead.name || "Customer"}
              </div>
              <div className="ops-subtitle">
                Account {safeLead.customer_id || safeLead.id || "N/A"}
              </div>
            </div>
            {upcomingDates.length > 0 && (
              <div className="ops-next">
                Next delivery: {formatShortDate(upcomingDates[0])}
              </div>
            )}
          </div>

          <div className="ops-grid">
            <div className="ops-kv">
              <div className="ops-label">Active Orders</div>
              <div className="ops-value">{orderSummary.activeCount}</div>
              <div className="ops-meta">Scheduled or in progress</div>
            </div>
            <div className="ops-kv">
              <div className="ops-label">Upcoming</div>
              <div className="ops-value">{orderSummary.upcomingCount}</div>
              <div className="ops-meta">Draft or scheduled</div>
            </div>
            <div className="ops-kv">
              <div className="ops-label">Fulfilled</div>
              <div className="ops-value">{orderSummary.fulfilledCount}</div>
              <div className="ops-meta">Completed deliveries</div>
            </div>
            <div className="ops-kv">
              <div className="ops-label">Outstanding</div>
              <div className="ops-value">{orderSummary.unpaidCount}</div>
              <div className="ops-meta">
                {orderSummary.unpaidTotal
                  ? formatCurrency(orderSummary.unpaidTotal)
                  : "Balance due"}
              </div>
            </div>
          </div>

          {(hasConstraints || opsNotes) && (
            <div className="ops-constraints">
              {constraints.allergies.length > 0 && (
                <div className="ops-constraint-row">
                  <div className="ops-label">Allergies</div>
                  <div className="ops-list">
                    {constraints.allergies.map((item) => (
                      <span key={item} className="ops-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {constraints.dietary.length > 0 && (
                <div className="ops-constraint-row">
                  <div className="ops-label">Dietary</div>
                  <div className="ops-list">
                    {constraints.dietary.map((item) => (
                      <span key={item} className="ops-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {opsNotes && (
                <div className="ops-constraint-row">
                  <div className="ops-label">Notes</div>
                  <div className="ops-note">{String(opsNotes)}</div>
                </div>
              )}
            </div>
          )}

          {orders.length > 0 && uiConfig.pipelines.includes("order_pipeline") && (
            <div className="ops-pipeline">
              {["Draft", "Scheduled", "Preparing", "Ready", "Fulfilled"].map(
                (stage) => {
                  const items = orderSummary.buckets[stage] || [];
                  return (
                    <div key={stage} className="ops-stage">
                      <div className="ops-stage-header">
                        <div className="ops-stage-title">{stage}</div>
                        <div className="ops-stage-count">{items.length}</div>
                      </div>
                      <div className="ops-stage-list">
                        {items.slice(0, 3).map((order, index) => {
                          const id = getOrderIdLabel(order);
                          const date = formatShortDate(getOrderDateValue(order));
                          const total = formatCurrency(getOrderAmountValue(order));
                          const line = [id ? `#${id}` : "Order", date, total]
                            .filter(Boolean)
                            .join(" | ");
                          return (
                            <div
                              key={`${id || "order"}-${date || "date"}-${index}`}
                              className="ops-stage-item"
                            >
                              {line}
                            </div>
                          );
                        })}
                        {items.length === 0 && (
                          <div className="ops-stage-empty">No items</div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {historyOrders.length > 0 && (
            <details className="ops-history">
              <summary>Order history ({historyOrders.length})</summary>
              <div className="ops-history-list">
                {historyOrders.map((order, index) => {
                  const id = getOrderIdLabel(order);
                  const date = formatShortDate(getOrderDateValue(order));
                  const total = formatCurrency(getOrderAmountValue(order));
                  return (
                    <div
                      key={`${id || "order"}-${date || "date"}-${index}`}
                      className="ops-history-row"
                    >
                      <div className="ops-history-id">
                        {id ? `#${id}` : "Order"}
                      </div>
                      <div className="ops-history-meta">
                        {[date, total].filter(Boolean).join(" | ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}

      <div className="info-main-row">
        <div className="info-main-left">
          <div className="info-group info-group--dense">
            <div className="info-section-header">
              <div>
                <div className="info-section-eyebrow">Customer profile</div>
                <div className="info-section-title">Contact Information</div>
              </div>
            </div>
            <div className="info-grid-2 info-grid-tight">
              <InfoField
                label="First Name"
                name="first_name"
                value={readFieldValue(safeLead, "first_name")}
                onValueChange={updateField}
              />
              <InfoField
                label="Last Name"
                name="last_name"
                value={readFieldValue(safeLead, "last_name")}
                onValueChange={updateField}
              />
              <InfoField
                label="Company Name"
                name="company_name"
                className="field-wide"
                value={readFieldValue(safeLead, "company_name")}
                onValueChange={updateField}
              />
              <InfoField
                label="Phone"
                name="primary_phone"
                type="tel"
                value={readFieldValue(
                  safeLead,
                  "primary_phone",
                  readFieldValue(safeLead, "phone_number")
                )}
                onValueChange={updateField}
              />
              <InfoField
                label="Email"
                name="primary_email"
                type="email"
                value={readFieldValue(
                  safeLead,
                  "primary_email",
                  readFieldValue(safeLead, "email")
                )}
                onValueChange={updateField}
              />
              <InfoField
                label="Secondary Phone"
                name="secondary_phone"
                type="tel"
                value={readFieldValue(safeLead, "secondary_phone")}
                onValueChange={updateField}
              />
              <InfoField
                label="Secondary Email"
                name="secondary_email"
                type="email"
                value={readFieldValue(safeLead, "secondary_email")}
                onValueChange={updateField}
              />
            </div>
          </div>

          <div className="info-group info-group--dense">
            <div className="info-section-header">
              <div>
                <div className="info-section-eyebrow">Account detail</div>
                <div className="info-section-title">Service & Industry</div>
              </div>
              {isCustomer ? (
                <button
                  className="ai-btn"
                  onClick={runEnrichment}
                  disabled={loadingEnrich}
                >
                  {loadingEnrich ? "Enriching..." : "Enrich"}
                </button>
              ) : null}
            </div>
            <div className="info-grid-2 info-grid-tight">
              <IndustryFields />
              <InfoField
                label="Access Notes"
                name="access_notes"
                textarea
                className="field-wide"
                value={readFieldValue(safeLead, "access_notes")}
                onValueChange={updateField}
              />
              {dynamicFields
                .filter(
                  (f) =>
                    !["first_name", "last_name", "full_name", "name", "address", "city", "state", "zip_code", "county", "country", "primary_phone", "primary_email"].includes(f.name)
                )
                .map((field) => (
                  <InfoField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    value={readFieldValue(safeLead, field.name)}
                    onValueChange={updateField}
                  />
                ))}
            </div>
            {safeLead.ai?.summary ? (
              <div className="ai-summary" style={{ marginTop: 10 }}>
                {safeLead.ai.summary}
              </div>
            ) : null}
          </div>
        </div>

        <div className="info-main-right">
          <div className="info-group info-group--dense info-address-group">
            <div className="info-section-header">
              <div>
                <div className="info-section-eyebrow">Property</div>
                <div className="info-section-title">Address & Map</div>
              </div>
              {mapHref ? (
                <a
                  className="info-map-link"
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Maps
                </a>
              ) : null}
            </div>

            <div className="info-grid-address-top">
              <InfoField
                label="Street Address"
                name="address"
                className="field-wide"
                value={readFieldValue(safeLead, "address")}
                onValueChange={updateField}
              />
              <InfoField
                label="Zip"
                name="zip_code"
                value={readFieldValue(safeLead, "zip_code")}
                onValueChange={updateField}
              />
            </div>

            <div className="info-grid-4 info-grid-tight">
              <InfoField
                label="City"
                name="city"
                value={readFieldValue(safeLead, "city")}
                onValueChange={updateField}
              />
              <InfoField
                label="State"
                name="state"
                value={readFieldValue(safeLead, "state")}
                onValueChange={updateField}
              />
              <InfoField
                label="County"
                name="county"
                value={readFieldValue(safeLead, "county")}
                onValueChange={updateField}
              />
              <InfoField
                label="Country"
                name="country"
                value={readFieldValue(safeLead, "country")}
                onValueChange={updateField}
              />
            </div>

            <div className="info-map">
              <InfoMapPanel addressQuery={addressQuery} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
