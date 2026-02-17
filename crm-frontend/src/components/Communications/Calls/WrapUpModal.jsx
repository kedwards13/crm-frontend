import React, { useMemo, useState } from "react";
import { wrapUpCall } from "../../../api/communications";
import "./WrapUpModal.css";

const OUTCOME_OPTIONS = [
  { value: "answered", label: "Answered" },
  { value: "no-answer", label: "No answer" },
  { value: "failed", label: "Failed" },
];

const DISPOSITION_OPTIONS = [
  { value: "follow_up", label: "Follow up" },
  { value: "do_not_contact", label: "Do not contact" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
];

export default function WrapUpModal({ call, onClose, onSaved }) {
  const callSid = useMemo(
    () => call?.call_sid || call?.sid || call?.id || "",
    [call]
  );
  const [outcome, setOutcome] = useState(call?.status || "answered");
  const [disposition, setDisposition] = useState("follow_up");
  const [notes, setNotes] = useState("");
  const [nextActionType, setNextActionType] = useState("task");
  const [nextActionTitle, setNextActionTitle] = useState("Follow up call");
  const [nextActionDue, setNextActionDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!callSid) {
      setError("Call SID missing; cannot submit wrap-up.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        outcome,
        disposition,
        notes,
        next_action: {
          type: nextActionType,
          due_date: nextActionDue || null,
          title: nextActionTitle || null,
        },
      };
      await wrapUpCall(callSid, payload);
      if (onSaved) onSaved(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to save wrap-up.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wrapup-backdrop">
      <div className="wrapup-modal">
        <div className="wrapup-header">
          <h3>Call wrap-up</h3>
          <button className="wrapup-close" onClick={onClose} aria-label="Close wrap-up">
            ×
          </button>
        </div>
        <p className="muted">
          Call SID: <span className="mono">{callSid || "Unknown"}</span>
        </p>

        {error && <div className="wrapup-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="wrapup-form">
          <div className="wrapup-row">
            <label>Outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="wrapup-row">
            <label>Disposition</label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
            >
              {DISPOSITION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="wrapup-row">
            <label>Notes</label>
            <textarea
              rows="3"
              placeholder="Summary, next steps, promises made…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="wrapup-grid">
            <div className="wrapup-row">
              <label>Next action type</label>
              <select
                value={nextActionType}
                onChange={(e) => setNextActionType(e.target.value)}
              >
                <option value="task">Task</option>
                <option value="booking">Booking</option>
              </select>
            </div>

            <div className="wrapup-row">
              <label>Next action title</label>
              <input
                type="text"
                value={nextActionTitle}
                onChange={(e) => setNextActionTitle(e.target.value)}
              />
            </div>

            <div className="wrapup-row">
              <label>Due date</label>
              <input
                type="date"
                value={nextActionDue}
                onChange={(e) => setNextActionDue(e.target.value)}
              />
            </div>
          </div>

          <div className="wrapup-actions">
            <button type="button" className="webphone-btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="webphone-btn primary" disabled={saving}>
              {saving ? "Saving…" : "Save wrap-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
