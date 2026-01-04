import React, { useEffect, useMemo, useState } from 'react';
import {
  listServiceTypes,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  listBusinessHours,
  createBusinessHours,
  updateBusinessHours,
  listTechnicians,
  listTechAvailability,
  createTechAvailability,
  deleteTechAvailability,
  listBlackouts,
  createBlackout,
  deleteBlackout,
} from '../../../api/schedulingApi';
import '../SettingsCommon.css';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const minuteToTime = (mins = 0) => {
  const safe = Number.isFinite(mins) ? mins : 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeToMinute = (value = '00:00') => {
  const [h, m] = String(value).split(':').map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
};

const getTenantId = () => {
  try {
    return JSON.parse(localStorage.getItem('activeTenant') || '{}')?.id || null;
  } catch {
    return null;
  }
};

export default function SchedulingSettings() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceDraft, setServiceDraft] = useState({
    name: '',
    code: '',
    category: 'general',
    default_duration_minutes: 60,
    buffer_before_minutes: 5,
    buffer_after_minutes: 10,
    max_parallel_jobs: 1,
    is_virtual: false,
  });

  const [hoursByDay, setHoursByDay] = useState({});
  const [savingDay, setSavingDay] = useState(null);

  const [technicians, setTechnicians] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [availabilityDraft, setAvailabilityDraft] = useState({
    tech: '',
    start_at: '',
    end_at: '',
    kind: 'unavailable',
    notes: '',
  });

  const [blackouts, setBlackouts] = useState([]);
  const [blackoutDraft, setBlackoutDraft] = useState({
    start_at: '',
    end_at: '',
    reason: '',
    is_global: true,
  });

  const tenantId = useMemo(getTenantId, []);

  const ensureTenant = () => {
    if (tenantId) return true;
    setMsg('Missing tenant info.');
    return false;
  };

  const loadAll = async () => {
    setLoading(true);
    setMsg('');
    try {
      const [
        serviceRes,
        hoursRes,
        techRes,
        availabilityRes,
        blackoutsRes,
      ] = await Promise.all([
        listServiceTypes(),
        listBusinessHours(),
        listTechnicians(),
        listTechAvailability(),
        listBlackouts(),
      ]);

      const serviceRows = Array.isArray(serviceRes.data)
        ? serviceRes.data
        : serviceRes.data?.results || [];
      const hoursRows = Array.isArray(hoursRes.data)
        ? hoursRes.data
        : hoursRes.data?.results || [];
      const techRows = Array.isArray(techRes.data)
        ? techRes.data
        : techRes.data?.results || [];
      const availabilityRows = Array.isArray(availabilityRes.data)
        ? availabilityRes.data
        : availabilityRes.data?.results || [];
      const blackoutRows = Array.isArray(blackoutsRes.data)
        ? blackoutsRes.data
        : blackoutsRes.data?.results || [];

      setServiceTypes(serviceRows);
      setTechnicians(techRows);
      setAvailability(availabilityRows);
      setBlackouts(blackoutRows);

      const seed = {};
      WEEKDAYS.forEach((_, idx) => {
        seed[idx] = {
          id: null,
          weekday: idx,
          open_time: '08:00',
          close_time: '18:00',
          is_closed: false,
        };
      });
      hoursRows.forEach((row) => {
        seed[row.weekday] = {
          id: row.id,
          weekday: row.weekday,
          open_time: minuteToTime(row.open_minute),
          close_time: minuteToTime(row.close_minute),
          is_closed: !!row.is_closed,
        };
      });
      setHoursByDay(seed);
    } catch (err) {
      setMsg(err?.message || 'Failed to load scheduling settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateServiceField = (id, field, value) => {
    setServiceTypes((prev) =>
      prev.map((service) =>
        service.id === id ? { ...service, [field]: value } : service
      )
    );
  };

  const saveServiceType = async (service) => {
    try {
      await updateServiceType(service.id, service);
      setMsg('Service type saved.');
    } catch {
      setMsg('Failed to save service type.');
    }
  };

  const removeServiceType = async (id) => {
    try {
      await deleteServiceType(id);
      setServiceTypes((prev) => prev.filter((service) => service.id !== id));
    } catch {
      setMsg('Failed to delete service type.');
    }
  };

  const createService = async () => {
    if (!serviceDraft.name.trim()) {
      setMsg('Service name is required.');
      return;
    }
    if (!ensureTenant()) return;
    try {
      const payload = { tenant: tenantId, ...serviceDraft };
      const { data } = await createServiceType(payload);
      setServiceTypes((prev) => [data, ...prev]);
      setServiceDraft({
        name: '',
        code: '',
        category: 'general',
        default_duration_minutes: 60,
        buffer_before_minutes: 5,
        buffer_after_minutes: 10,
        max_parallel_jobs: 1,
        is_virtual: false,
      });
      setMsg('Service type created.');
    } catch {
      setMsg('Failed to create service type.');
    }
  };

  const updateHoursField = (weekday, field, value) => {
    setHoursByDay((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], [field]: value },
    }));
  };

  const saveBusinessHours = async (weekday) => {
    const row = hoursByDay[weekday];
    if (!row) return;
    if (!ensureTenant()) return;
    try {
      setSavingDay(weekday);
      const payload = {
        tenant: tenantId,
        weekday,
        open_minute: timeToMinute(row.open_time),
        close_minute: timeToMinute(row.close_time),
        is_closed: !!row.is_closed,
      };
      if (row.id) {
        await updateBusinessHours(row.id, payload);
      } else {
        const { data } = await createBusinessHours(payload);
        updateHoursField(weekday, 'id', data.id);
      }
      setMsg('Business hours saved.');
    } catch {
      setMsg('Failed to save business hours.');
    } finally {
      setSavingDay(null);
    }
  };

  const addAvailability = async () => {
    if (!availabilityDraft.tech || !availabilityDraft.start_at || !availabilityDraft.end_at) {
      setMsg('Select tech, start, and end.');
      return;
    }
    if (!ensureTenant()) return;
    try {
      const payload = { ...availabilityDraft, tenant: tenantId };
      const { data } = await createTechAvailability(payload);
      setAvailability((prev) => [data, ...prev]);
      setAvailabilityDraft({
        tech: '',
        start_at: '',
        end_at: '',
        kind: 'unavailable',
        notes: '',
      });
      setMsg('Availability saved.');
    } catch {
      setMsg('Failed to save availability.');
    }
  };

  const removeAvailability = async (id) => {
    try {
      await deleteTechAvailability(id);
      setAvailability((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setMsg('Failed to delete availability.');
    }
  };

  const addBlackout = async () => {
    if (!blackoutDraft.start_at || !blackoutDraft.end_at) {
      setMsg('Start and end are required.');
      return;
    }
    if (!ensureTenant()) return;
    try {
      const payload = { ...blackoutDraft, tenant: tenantId };
      const { data } = await createBlackout(payload);
      setBlackouts((prev) => [data, ...prev]);
      setBlackoutDraft({ start_at: '', end_at: '', reason: '', is_global: true });
      setMsg('Blackout created.');
    } catch {
      setMsg('Failed to create blackout.');
    }
  };

  const removeBlackout = async (id) => {
    try {
      await deleteBlackout(id);
      setBlackouts((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setMsg('Failed to delete blackout.');
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <p>Loading scheduling settings…</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h2>Scheduling</h2>
      {msg && <p className="settings-msg">{msg}</p>}

      <div className="settings-card">
        <h3>Service Types</h3>
        <div className="settings-form two-col">
          <label>
            Name
            <input
              value={serviceDraft.name}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label>
            Category
            <input
              value={serviceDraft.category}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, category: e.target.value }))}
            />
          </label>
          <label>
            Duration (mins)
            <input
              type="number"
              value={serviceDraft.default_duration_minutes}
              onChange={(e) =>
                setServiceDraft((prev) => ({
                  ...prev,
                  default_duration_minutes: Number(e.target.value || 0),
                }))
              }
            />
          </label>
          <label>
            Code
            <input
              value={serviceDraft.code}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, code: e.target.value }))}
            />
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={!!serviceDraft.is_virtual}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, is_virtual: e.target.checked }))}
            />
            <span>Virtual service</span>
          </label>
        </div>
        <div className="settings-actions">
          <button className="settings-primary" onClick={createService}>
            Add Service Type
          </button>
        </div>
        {serviceTypes.length === 0 ? (
          <p className="muted">No service types yet.</p>
        ) : (
          serviceTypes.map((service) => (
            <div key={service.id} className="settings-card">
              <div className="settings-form two-col">
                <label>
                  Name
                  <input
                    value={service.name || ''}
                    onChange={(e) => updateServiceField(service.id, 'name', e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <input
                    value={service.category || ''}
                    onChange={(e) => updateServiceField(service.id, 'category', e.target.value)}
                  />
                </label>
                <label>
                  Duration (mins)
                  <input
                    type="number"
                    value={service.default_duration_minutes || 0}
                    onChange={(e) =>
                      updateServiceField(service.id, 'default_duration_minutes', Number(e.target.value || 0))
                    }
                  />
                </label>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={!!service.is_virtual}
                    onChange={(e) => updateServiceField(service.id, 'is_virtual', e.target.checked)}
                  />
                  <span>Virtual service</span>
                </label>
              </div>
              <div className="settings-actions">
                <button className="settings-primary" onClick={() => saveServiceType(service)}>
                  Save
                </button>
                <button className="settings-secondary" onClick={() => removeServiceType(service.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="settings-card">
        <h3>Business Hours</h3>
        {WEEKDAYS.map((label, idx) => {
          const row = hoursByDay[idx] || {};
          return (
            <div key={idx} className="settings-card">
              <h4>{label}</h4>
              <div className="settings-form two-col">
                <label>
                  Open
                  <input
                    type="time"
                    value={row.open_time || '08:00'}
                    onChange={(e) => updateHoursField(idx, 'open_time', e.target.value)}
                    disabled={row.is_closed}
                  />
                </label>
                <label>
                  Close
                  <input
                    type="time"
                    value={row.close_time || '18:00'}
                    onChange={(e) => updateHoursField(idx, 'close_time', e.target.value)}
                    disabled={row.is_closed}
                  />
                </label>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={!!row.is_closed}
                    onChange={(e) => updateHoursField(idx, 'is_closed', e.target.checked)}
                  />
                  <span>Closed</span>
                </label>
              </div>
              <div className="settings-actions">
                <button
                  className="settings-primary"
                  onClick={() => saveBusinessHours(idx)}
                  disabled={savingDay === idx}
                >
                  {savingDay === idx ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="settings-card">
        <h3>Technicians</h3>
        {technicians.length === 0 ? (
          <p className="muted">No technicians found.</p>
        ) : (
          technicians.map((tech) => (
            <div key={tech.id} className="settings-card">
              <strong>{tech.user_name || 'Tech'}</strong>
              <div className="muted">Role: {tech.role_type || 'tech'}</div>
            </div>
          ))
        )}
      </div>

      <div className="settings-card">
        <h3>Tech Availability</h3>
        <div className="settings-form two-col">
          <label>
            Technician
            <select
              value={availabilityDraft.tech}
              onChange={(e) => setAvailabilityDraft((prev) => ({ ...prev, tech: e.target.value }))}
            >
              <option value="">Select tech</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.user_name || tech.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kind
            <select
              value={availabilityDraft.kind}
              onChange={(e) => setAvailabilityDraft((prev) => ({ ...prev, kind: e.target.value }))}
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label>
            Start
            <input
              type="datetime-local"
              value={availabilityDraft.start_at}
              onChange={(e) => setAvailabilityDraft((prev) => ({ ...prev, start_at: e.target.value }))}
            />
          </label>
          <label>
            End
            <input
              type="datetime-local"
              value={availabilityDraft.end_at}
              onChange={(e) => setAvailabilityDraft((prev) => ({ ...prev, end_at: e.target.value }))}
            />
          </label>
          <label>
            Notes
            <input
              value={availabilityDraft.notes}
              onChange={(e) => setAvailabilityDraft((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
        </div>
        <div className="settings-actions">
          <button className="settings-primary" onClick={addAvailability}>
            Add Availability
          </button>
        </div>
        {availability.map((item) => (
          <div key={item.id} className="settings-card">
            <div>{item.tech_name || item.tech}</div>
            <div className="muted">
              {item.kind} • {item.start_at} → {item.end_at}
            </div>
            {item.notes || item.reason ? (
              <div className="muted">{item.notes || item.reason}</div>
            ) : null}
            <div className="settings-actions">
              <button className="settings-secondary" onClick={() => removeAvailability(item.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="settings-card">
        <h3>Blackout Dates</h3>
        <div className="settings-form two-col">
          <label>
            Start
            <input
              type="datetime-local"
              value={blackoutDraft.start_at}
              onChange={(e) => setBlackoutDraft((prev) => ({ ...prev, start_at: e.target.value }))}
            />
          </label>
          <label>
            End
            <input
              type="datetime-local"
              value={blackoutDraft.end_at}
              onChange={(e) => setBlackoutDraft((prev) => ({ ...prev, end_at: e.target.value }))}
            />
          </label>
          <label>
            Reason
            <input
              value={blackoutDraft.reason}
              onChange={(e) => setBlackoutDraft((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={!!blackoutDraft.is_global}
              onChange={(e) => setBlackoutDraft((prev) => ({ ...prev, is_global: e.target.checked }))}
            />
            <span>Global blackout</span>
          </label>
        </div>
        <div className="settings-actions">
          <button className="settings-primary" onClick={addBlackout}>
            Add Blackout
          </button>
        </div>
        {blackouts.map((item) => (
          <div key={item.id} className="settings-card">
            <div className="muted">
              {item.start_at} → {item.end_at}
            </div>
            <div>{item.reason || 'No reason provided'}</div>
            <div className="settings-actions">
              <button className="settings-secondary" onClick={() => removeBlackout(item.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
