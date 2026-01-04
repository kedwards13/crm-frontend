import React, { useState } from "react";
import StreetViewEmbed from "../../../utils/StreetViewEmbed";
import { toast } from "react-toastify";
import { enrichCustomer } from "../../../api/customersApi";
import "./info-tab.css";

export default function InfoTab({ lead, onChange }) {
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  if (!lead) return <div className="info-empty">Loading...</div>;

  const isCustomer = lead.object === "customer" || lead.customer_id != null;

  const updateField = (field, value) => {
    onChange({ target: { name: field, value } });
  };

  const Field = ({
    label,
    name,
    type = "text",
    textarea = false,
    className = "",
    options,
    fallback,
  }) => {
    const value = lead[name] ?? fallback ?? "";

    return (
      <div className={`info-field ${className}`}>
        <label className="info-label">{label}</label>

        {options ? (
          <select
            className="info-input"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
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
            className="info-input info-textarea"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
          />
        ) : (
          <input
            type={type}
            className="info-input"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
          />
        )}
      </div>
    );
  };

  if (lead.object === "lead") {
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
        <div className="info-main-row">
          <div className="info-main-left">
            <div className="info-group">
              <div className="info-section-title">Lead Details</div>
              <div className="info-grid-2">
                <Field label="First Name" name="first_name" />
                <Field label="Last Name" name="last_name" />
                <Field label="Display Name" name="name" />
                <Field label="Status" name="status" options={statusOptions} />
                <Field
                  label="Primary Email"
                  name="primary_email"
                  type="email"
                  fallback={lead.email}
                />
                <Field
                  label="Primary Phone"
                  name="primary_phone"
                  type="tel"
                  fallback={lead.phone_number}
                />
                <Field label="Industry" name="industry" />
                <Field label="Address" name="address" className="field-wide" />
              </div>
            </div>
          </div>

          <div className="info-main-right">
            <div className="info-group">
              <div className="info-section-title">Summary</div>
              <div className="info-grid-2">
                <Field label="Summary" name="summary" textarea className="field-wide" />
                <Field label="Priority Score" name="priority_score" type="number" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const IndustryFields = () => {
    switch (lead.industry) {
      case "landscaping":
        return (
          <>
            <Field label="Project Type" name="project_type" />
            <Field label="Square Footage" name="square_footage" />
            <Field label="Budget" name="budget" />
            <Field label="Deadline" name="deadline" />
          </>
        );

      case "pest":
      case "pest_control":
        return (
          <>
            <Field label="Service Type" name="service_type" />
            <Field label="Irrigation Type" name="irrigation_type" />
            <Field label="Last Treatment" name="last_treatment" />
            <Field label="Notes" name="notes" textarea />
          </>
        );

      case "cleaning":
        return (
          <>
            <Field label="Cleaning Type" name="cleaning_type" />
            <Field label="Frequency" name="frequency" />
            <Field label="Pets" name="pets" />
            <Field label="Notes" name="notes" textarea />
          </>
        );

      case "real_estate":
        return (
          <>
            <Field label="Property Type" name="property_type" />
            <Field label="Bedrooms" type="number" name="number_of_bedrooms" />
            <Field label="Bathrooms" type="number" name="number_of_bathrooms" />
            <Field label="Condition" name="condition" />
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
      const res = await enrichCustomer(lead.customer_id || lead.id);
      const data = res?.data || {};
      setLoadingEnrich(false);

      if (data?.error) return toast.error(data.error || "Enrichment failed.");
      toast.success("Enrichment complete.");
    } catch (err) {
      setLoadingEnrich(false);
      toast.error("Enrichment error.");
    }
  };

  return (
    <div className="info-tab">
      <div className="info-main-row">
        {/* LEFT SIDE */}
        <div className="info-main-left">
          <div className="info-group">
            <div className="info-section-title">Identity</div>
            <div className="info-grid-2">
              <Field label="First Name" name="first_name" />
              <Field label="Last Name" name="last_name" />
              <Field label="Full Name" name="full_name" />
              <Field label="Company Name" name="company_name" />
            </div>
          </div>

          <div className="info-group">
            <div className="info-section-title">Contact</div>
            <div className="info-grid-2">
              <Field label="Primary Phone" name="primary_phone" />
              <Field label="Primary Email" name="primary_email" />
              <Field label="Secondary Phone" name="secondary_phone" />
              <Field label="Secondary Email" name="secondary_email" />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="info-main-right">
          <div className="info-group info-address-group">
            <div className="info-section-title">Address</div>

            {/* TOP ROW — STREET + ZIP */}
            <div className="info-grid-2">
              <Field label="Street Address" name="address" className="field-wide" />
              <Field label="Zip" name="zip_code" />
            </div>

            {/* SECOND ROW — CITY, STATE, COUNTY, COUNTRY */}
            <div className="info-grid-4">
              <Field label="City" name="city" />
              <Field label="State" name="state" />
              <Field label="County" name="county" />
              <Field label="Country" name="country" />
            </div>
          </div>

          {/* MAP */}
          <div className="info-map">
            <StreetViewEmbed address={lead.address} />
          </div>
        </div>
      </div>

      {/* SECOND ROW */}
      <div className="info-secondary-row">
        <div className="info-group info-industry-group">
          <div className="info-section-title">Industry Details</div>
          <div className="info-grid-3 industry-grid">
            <IndustryFields />
          </div>
        </div>

        <div className="info-group info-ai-group">
          <div className="info-section-title">AI Enrichment</div>
          <div className="ai-layout">
            <div className="ai-summary">{lead.ai?.summary || "No AI summary yet."}</div>
            {isCustomer ? (
              <button className="ai-btn" onClick={runEnrichment} disabled={loadingEnrich}>
                {loadingEnrich ? "Enriching…" : "Run Enrichment"}
              </button>
            ) : (
              <div className="ai-disabled">Convert to customer to enable enrichment.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
