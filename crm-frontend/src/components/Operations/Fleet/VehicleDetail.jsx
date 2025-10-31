// src/components/Operations/Fleet/VehicleDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import useFleetApi from "./useFleetApi";
import InsuranceFormModal from "./InsuranceFormModal";
import "./FleetReports.css";

export default function VehicleDetail({ vehicle }) {
  const {
    listRecords,
    listFuelLogs,
    listInsurance,
    createInsurance,
    createRecord,
    completeAndRoll,
  } = useFleetApi();

  const [records, setRecords] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const vehicleId = vehicle?.id;

  // ───── Data Loader ─────
  const loadAll = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const [r, f, i] = await Promise.all([
        listRecords(vehicleId),
        listFuelLogs(vehicleId),
        listInsurance(vehicleId),
      ]);
      setRecords(Array.isArray(r) ? r : r.results || []);
      setFuelLogs(Array.isArray(f) ? f : f.results || []);
      setInsurance(Array.isArray(i) ? i : i.results || []);
    } catch (err) {
      console.error("Failed to load vehicle detail data", err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, listRecords, listFuelLogs, listInsurance]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ───── Maintenance Actions ─────
  const addOilChange = async () => {
    try {
      await createRecord({
        vehicle: vehicleId,
        kind: "oil_change",
        service_date: new Date().toISOString().slice(0, 10),
        odometer_at_service: vehicle.odometer || 0,
        vendor: "Internal",
        cost: 0,
        notes: "Quick oil change entry",
      });
      await loadAll();
    } catch (err) {
      console.error("Failed to add oil change record", err);
    }
  };

  const markAsComplete = async (rec) => {
    try {
      await completeAndRoll({
        vehicle: vehicleId,
        kind: rec.kind,
        service_date: new Date().toISOString().slice(0, 10),
        odometer_at_service: vehicle.odometer || 0,
        vendor: rec.vendor || "Internal",
        cost: rec.cost || 0,
        notes: rec.notes || "Completed automatically",
      });
      await loadAll();
    } catch (err) {
      console.error("Failed to complete record", err);
    }
  };

  if (loading) return <div className="fleet-skel">Loading details…</div>;

  return (
    <div className="fleet-reports vdetail">
      {/* Vehicle Info */}
      <section className="panel">
        <div className="panel-head">
          <h3>Vehicle Information</h3>
        </div>
        <div className="panel-body grid grid--2 small">
          <div><strong>Make:</strong> {vehicle.make || "—"}</div>
          <div><strong>Model:</strong> {vehicle.model || "—"}</div>
          <div><strong>Year:</strong> {vehicle.year || "—"}</div>
          <div><strong>VIN:</strong> <span className="mono">{vehicle.vin || "—"}</span></div>
          <div><strong>Plate:</strong> {vehicle.plate || "—"}</div>
          <div><strong>Status:</strong> <span className="cap">{vehicle.status || "—"}</span></div>
          <div><strong>Odometer:</strong> {vehicle.odometer?.toLocaleString?.() || "—"} mi</div>
          <div><strong>Next Service:</strong> {vehicle.next_service_due_miles || "—"} mi</div>
        </div>
      </section>

      {/* Maintenance */}
      <section className="panel">
        <div className="panel-head flex-between">
          <h3>Maintenance Records</h3>
          <button className="mini" onClick={addOilChange}>+ Quick Oil Change</button>
        </div>
        <div className="table">
          <div className="thead">
            <div>Kind</div>
            <div>Date</div>
            <div>Vendor</div>
            <div>Cost</div>
            <div>Status</div>
            <div></div>
          </div>
          <div className="tbody">
            {records.length > 0 ? (
              records.map((r) => (
                <div key={r.id} className="row small">
                  <div>{r.kind || "—"}</div>
                  <div>{r.service_date || "—"}</div>
                  <div>{r.vendor || "—"}</div>
                  <div>${r.cost?.toFixed?.(2) || "0.00"}</div>
                  <div className="cap">{r.status || "open"}</div>
                  <div className="row-actions">
                    <button className="link" onClick={() => markAsComplete(r)}>
                      Mark Complete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="row muted">No maintenance records found.</div>
            )}
          </div>
        </div>
      </section>

      {/* Fuel Logs */}
      <section className="panel">
        <div className="panel-head">
          <h3>Fuel Logs</h3>
        </div>
        <div className="table">
          <div className="thead">
            <div>Date</div>
            <div>Gallons</div>
            <div>Cost</div>
            <div>Vendor</div>
          </div>
          <div className="tbody">
            {fuelLogs.length > 0 ? (
              fuelLogs.map((f) => (
                <div key={f.id} className="row small">
                  <div>{f.date || "—"}</div>
                  <div>{f.volume || "—"}</div>
                  <div>${f.price_total || "—"}</div>
                  <div>{f.vendor || "—"}</div>
                </div>
              ))
            ) : (
              <div className="row muted">No fuel logs available.</div>
            )}
          </div>
        </div>
      </section>

      {/* Insurance */}
      <section className="panel">
        <div className="panel-head flex-between">
          <h3>Insurance Policies</h3>
          <button className="mini" onClick={() => setShowInsuranceForm(true)}>+ Add Policy</button>
        </div>
        <div className="table">
          <div className="thead">
            <div>Provider</div>
            <div>Policy #</div>
            <div>Start Date</div>
            <div>Expiration</div>
            <div>Monthly Premium</div>
          </div>
          <div className="tbody">
            {insurance.length > 0 ? (
              insurance.map((p) => (
                <div key={p.id} className="row small">
                  <div>{p.provider || "—"}</div>
                  <div>{p.policy_number || "—"}</div>
                  <div>{p.start_date || "—"}</div>
                  <div>{p.expiration_date || "—"}</div>
                  <div>${p.monthly_premium || "—"}</div>
                </div>
              ))
            ) : (
              <div className="row muted">No insurance records found.</div>
            )}
          </div>
        </div>
      </section>

      {showInsuranceForm && (
        <InsuranceFormModal
          vehicleId={vehicleId}
          onSave={async (data) => {
            await createInsurance(data);
            await loadAll();
          }}
          onClose={() => setShowInsuranceForm(false)}
        />
      )}
    </div>
  );
}