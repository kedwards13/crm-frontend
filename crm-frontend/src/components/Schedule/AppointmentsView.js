import React, { useEffect, useMemo, useState } from 'react';
import {
  listAppointments,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  rescheduleAppointment,
} from '../../api/appointmentsApi';
import { getIndustryKey, getSchedulingConfig } from '../../constants/uiRegistry';
import './AppointmentsView.css';

const AppointmentsView = () => {
  const industryKey = getIndustryKey('general');
  const schedulingConfig = getSchedulingConfig(industryKey);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await listAppointments();
      const rows = Array.isArray(data) ? data : data?.results || [];
      setAppointments(rows);
    } catch (err) {
      setError(err?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return appointments;
    return appointments.filter((appt) => {
      const customer = appt.customer || {};
      const lead = appt.lead || {};
      const name =
        (typeof customer === 'object'
          ? customer.full_name ||
            customer.name ||
            [customer.first_name, customer.last_name].filter(Boolean).join(' ')
          : customer
          ? `Customer ${customer}`
          : '') ||
        lead.full_name ||
        lead.name ||
        '';
      const service =
        appt.service_type?.name ||
        appt.service_type?.title ||
        appt.service_type_name ||
        appt.offering?.name ||
        appt.service_type ||
        '';
      return `${name} ${service}`.toLowerCase().includes(needle);
    });
  }, [appointments, query]);

  const updateStatus = async (id, status) => {
    try {
      setSavingId(id);
      await updateAppointment(id, { status });
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === id ? { ...appt, status } : appt))
      );
    } catch {
      setError('Failed to update status.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = async (id) => {
    try {
      setSavingId(id);
      await cancelAppointment(id);
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === id ? { ...appt, status: 'canceled' } : appt))
      );
    } catch {
      setError('Failed to cancel appointment.');
    } finally {
      setSavingId(null);
    }
  };

  const handleComplete = async (id) => {
    try {
      setSavingId(id);
      await completeAppointment(id);
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === id ? { ...appt, status: 'completed' } : appt))
      );
    } catch {
      setError('Failed to complete appointment.');
    } finally {
      setSavingId(null);
    }
  };

  const splitDateTime = (value) => {
    if (!value) return { date: '', time: '' };
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return { date: '', time: '' };
    const pad = (n) => String(n).padStart(2, '0');
    return {
      date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
      time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    };
  };

  const openReschedule = (appt) => {
    const start = splitDateTime(appt.start_time || appt.scheduled_start || appt.start);
    const end = splitDateTime(appt.end_time || appt.scheduled_end || appt.end);
    setRescheduleTarget({
      id: appt.id,
      startDate: start.date,
      startTime: start.time,
      endDate: end.date || start.date,
      endTime: end.time,
    });
  };

  const saveReschedule = async () => {
    if (!rescheduleTarget?.id) return;
    const { id, startDate, startTime, endDate, endTime } = rescheduleTarget;
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide start and end time.');
      return;
    }
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Invalid date/time.');
      return;
    }
    try {
      setSavingId(id);
      await rescheduleAppointment(id, {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === id
            ? { ...appt, start_time: start.toISOString(), end_time: end.toISOString() }
            : appt
        )
      );
      setRescheduleTarget(null);
    } catch {
      setError('Failed to reschedule.');
    } finally {
      setSavingId(null);
    }
  };

  const formatTime = (value) => {
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleString();
  };

  const statusOptions = ['scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show'];

  return (
    <div className="appointments-view">
      <div className="appointments-header">
        <div>
          <h2>Appointments</h2>
          <p className="muted">Manage upcoming work and update status in place.</p>
        </div>
        <button className="appointments-refresh" onClick={loadAppointments}>
          Refresh
        </button>
      </div>

      <div className="appointments-toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${schedulingConfig.serviceLabel || 'service'} or contact…`}
        />
        {loading && <span className="appointments-status">Loading…</span>}
        {error && <span className="appointments-status error">{error}</span>}
      </div>

      <div className="appointments-table">
        <div className="appointments-row appointments-head">
          <span>Contact</span>
          <span>{schedulingConfig.serviceLabel || 'Service'}</span>
          <span>Start</span>
          <span>End</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {filtered.length === 0 && !loading ? (
          <div className="appointments-empty">No appointments match your filters.</div>
        ) : (
          filtered.map((appt) => {
            const customer = appt.customer || {};
            const lead = appt.lead || {};
            const name =
              (typeof customer === 'object'
                ? customer.full_name ||
                  customer.name ||
                  [customer.first_name, customer.last_name].filter(Boolean).join(' ')
                : customer
                ? `Customer ${customer}`
                : '') ||
              lead.full_name ||
              lead.name ||
              'Appointment';
            const service =
              appt.service_type?.name ||
              appt.service_type?.title ||
              appt.service_type_name ||
              appt.offering?.name ||
              appt.service_type ||
              appt.notes ||
              '—';

            return (
              <div key={appt.id} className="appointments-row">
                <span>{name}</span>
                <span>{service}</span>
                <span>{formatTime(appt.start_time || appt.scheduled_start || appt.start)}</span>
                <span>{formatTime(appt.end_time || appt.scheduled_end || appt.end)}</span>
                <span>
                  <select
                    value={appt.status || 'scheduled'}
                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                    disabled={savingId === appt.id}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="appointments-actions">
                  <button
                    type="button"
                    onClick={() => openReschedule(appt)}
                    disabled={savingId === appt.id}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComplete(appt.id)}
                    disabled={savingId === appt.id}
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(appt.id)}
                    disabled={savingId === appt.id}
                  >
                    Cancel
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      {rescheduleTarget && (
        <div className="appointments-modal">
          <div className="appointments-modal-card">
            <h3>Reschedule Appointment</h3>
            <div className="appointments-modal-grid">
              <label>
                Start Date
                <input
                  type="date"
                  value={rescheduleTarget.startDate}
                  onChange={(e) =>
                    setRescheduleTarget((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Start Time
                <input
                  type="time"
                  value={rescheduleTarget.startTime}
                  onChange={(e) =>
                    setRescheduleTarget((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  value={rescheduleTarget.endDate}
                  onChange={(e) =>
                    setRescheduleTarget((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                End Time
                <input
                  type="time"
                  value={rescheduleTarget.endTime}
                  onChange={(e) =>
                    setRescheduleTarget((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="appointments-modal-actions">
              <button type="button" onClick={() => setRescheduleTarget(null)}>
                Close
              </button>
              <button type="button" onClick={saveReschedule} disabled={savingId === rescheduleTarget.id}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsView;
