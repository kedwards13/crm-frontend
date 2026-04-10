import React from "react";

const clean = (value) => String(value || "").trim();

export default function NotesTab({ record, formData = {}, onFieldChange }) {
  const isLead = record?.object === "lead";

  const notesValue = isLead
    ? formData.notes ?? formData.message ?? ""
    : formData.access_notes ??
      formData.extended_fields?.notes ??
      record?.raw?.access_notes ??
      record?.raw?.extended_fields?.notes ??
      "";

  const followupValue =
    formData.extended_fields?.follow_up ??
    record?.raw?.extended_fields?.follow_up ??
    "";

  const update = (key, value) => {
    if (typeof onFieldChange !== "function") return;
    onFieldChange(key, value);
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {isLead ? "Lead Notes *" : "Customer Notes"}
        </label>
        <textarea
          value={notesValue}
          onChange={(e) => {
            if (isLead) {
              update("notes", e.target.value);
              return;
            }
            update("access_notes", e.target.value);
          }}
          style={{
            width: "100%",
            minHeight: 140,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 10,
            resize: "vertical",
          }}
          placeholder="Capture context, objections, and call notes..."
        />
      </div>

      {!isLead ? (
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            Follow-Up Plan
          </label>
          <textarea
            value={followupValue}
            onChange={(e) => {
              const existing =
                formData.extended_fields && typeof formData.extended_fields === "object"
                  ? formData.extended_fields
                  : {};
              update("extended_fields", {
                ...existing,
                follow_up: e.target.value,
                notes: clean(notesValue),
              });
            }}
            style={{
              width: "100%",
              minHeight: 100,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: 10,
              resize: "vertical",
            }}
            placeholder="Next actions, owner, and due date details..."
          />
        </div>
      ) : null}

      <div style={{ color: "#6b7280", fontSize: 12 }}>
        Notes are saved when you click <strong>Save</strong> in the profile footer.
      </div>
    </div>
  );
}
