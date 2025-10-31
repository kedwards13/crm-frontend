import React, { useState } from "react";
import "./FleetReports.css";

export default function InsuranceFormModal({ vehicleId, onSave, onClose }) {
  const [form, setForm] = useState({
    provider: "",
    policy_number: "",
    start_date: "",
    expiration_date: "",
    monthly_premium: "",
  });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, vehicle: vehicleId });
      onClose();
    } catch (err) {
      console.error("Failed to save policy:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Add Insurance Policy</h2>
        <form onSubmit={onSubmit} className="form-grid">
          <label>Provider<input name="provider" value={form.provider} onChange={onChange} /></label>
          <label>Policy #<input name="policy_number" value={form.policy_number} onChange={onChange} /></label>
          <label>Start Date<input type="date" name="start_date" value={form.start_date} onChange={onChange} /></label>
          <label>Expiration<input type="date" name="expiration_date" value={form.expiration_date} onChange={onChange} /></label>
          <label>Monthly Premium ($)<input type="number" name="monthly_premium" value={form.monthly_premium} onChange={onChange} /></label>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="secondary">Cancel</button>
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}