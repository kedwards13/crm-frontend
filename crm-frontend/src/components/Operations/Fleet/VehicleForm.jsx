import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useFleetApi from './useFleetApi';
import './FleetReports.css';

const EMPTY = {
  unit_code: '', type: 'truck', make: '', model: '', year: '',
  vin: '', plate: '', status: 'active', odometer: '', in_service_date: '',
  fuel_type: 'gas'
};

export default function VehicleForm() {
  const { id } = useParams();
  const editing = !!id;
  const { getVehicle, createVehicle, updateVehicle } = useFleetApi();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const data = await getVehicle(id);
      setForm({
        unit_code: data.unit_code || '',
        type: data.type || 'truck',
        make: data.make || '', model: data.model || '',
        year: data.year || '', vin: data.vin || '', plate: data.plate || '',
        status: data.status || 'active',
        odometer: data.odometer ?? '',
        in_service_date: data.in_service_date || '',
        fuel_type: data.fuel_type || 'gas',
      });
    })();
  }, [editing, id, getVehicle]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : null,
        odometer: form.odometer === '' ? null : Number(form.odometer),
      };
      if (editing) await updateVehicle(id, payload);
      else await createVehicle(payload);
      navigate('/operations/fleet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>{editing ? 'Edit Vehicle' : 'New Vehicle'}</h1>
      </header>

      <section className="panel">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>Unit Code<input name="unit_code" value={form.unit_code} onChange={onChange}/></label>
          <label>Type
            <select name="type" value={form.type} onChange={onChange}>
              <option value="truck">truck</option><option value="van">van</option>
              <option value="car">car</option><option value="sprayer">sprayer</option>
              <option value="trailer">trailer</option><option value="other">other</option>
            </select>
          </label>
          <label>Make<input name="make" value={form.make} onChange={onChange}/></label>
          <label>Model<input name="model" value={form.model} onChange={onChange}/></label>
          <label>Year<input name="year" type="number" value={form.year} onChange={onChange}/></label>
          <label>VIN<input name="vin" value={form.vin} onChange={onChange}/></label>
          <label>Plate<input name="plate" value={form.plate} onChange={onChange}/></label>
          <label>Status
            <select name="status" value={form.status} onChange={onChange}>
              <option value="active">active</option>
              <option value="in_service">in_service</option>
              <option value="retired">retired</option>
            </select>
          </label>
          <label>Odometer (mi)<input name="odometer" type="number" value={form.odometer} onChange={onChange}/></label>
          <label>In Service Date<input name="in_service_date" type="date" value={form.in_service_date} onChange={onChange}/></label>
          <label>Fuel Type
            <select name="fuel_type" value={form.fuel_type} onChange={onChange}>
              <option value="gas">gas</option><option value="diesel">diesel</option>
              <option value="hybrid">hybrid</option><option value="ev">ev</option>
            </select>
          </label>

          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}