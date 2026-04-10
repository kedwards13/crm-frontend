import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { CalendarDays, MapPinned, RefreshCw, Route, Users } from 'lucide-react';
import { listServiceTypes, listSchedules, listTechnicians, reschedule, updateSchedule, getDispatchBoard, cancelSchedule } from '../../api/schedulingApi';
import { listOperationalSchedules, listOperationalTechnicians } from '../../api/operationsSchedulingApi';
import api, { normalizeArray } from '../../apiClient';
import StatusPill from '../ui/StatusPill';
import KeyValueGrid from '../ui/KeyValueGrid';
import './CalendarView.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const clean = (value) => String(value || '').trim();

const toRows = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

const toDate = (value) => {
  const next = new Date(value || 0);
  return Number.isNaN(next.getTime()) ? null : next;
};

const eventColor = (status) => {
  const state = clean(status).toLowerCase();
  if (state === 'completed') return 'var(--success)';
  if (state === 'canceled' || state === 'cancelled' || state === 'no_show') return 'var(--danger)';
  if (state === 'in_progress') return 'var(--warning)';
  if (state === 'confirmed') return 'var(--accent-secondary)';
  return 'var(--accent)';
};

const lastName = (full) => {
  const name = clean(full);
  if (!name) return 'Customer';
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : name;
};

function EventCard({ event }) {
  const [open, setOpen] = useState(false);
  const addressLine = [event.address, [event.city, event.state].filter(Boolean).join(', ')].filter(Boolean).join(' ');
  const customerHref =
    event.customerHref ||
    (event.customerId ? `/customers/${encodeURIComponent(event.customerId)}` : '');
  return (
    <div
      className='calendar-event-card'
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className='calendar-event-top'>
        <strong className='calendar-event-name'>{lastName(event.customerName)}</strong>
        <StatusPill status={event.status} className='calendar-event-pill' />
      </div>
      <div className='calendar-event-sub'>{event.serviceName}</div>
      <div className='calendar-event-meta'>
        <span>{event.windowLabel}</span>
        <span className='muted'>{event.techName}</span>
      </div>

      {open ? (
        <div className='calendar-event-hover'>
          <div className='title'>{event.customerName}</div>
          {addressLine ? <div className='muted'>{addressLine}</div> : null}
          {event.notes ? <div className='notes'>{event.notes}</div> : null}
          <div className='actions'>
            {customerHref ? (
              <a className='btn secondary' href={customerHref}>
                Open Customer
              </a>
            ) : null}
            {event.onComplete ? (
              <button className='btn' type='button' onClick={(e) => { e.stopPropagation(); event.onComplete?.(); }}>
                Complete
              </button>
            ) : null}
            {event.onCancel ? (
              <button className='btn danger' type='button' onClick={(e) => { e.stopPropagation(); event.onCancel?.(); }}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CalendarView({ initialView = 'week' }) {
  const [view, setView] = useState(initialView);
  const [opsMode, setOpsMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [techFilter, setTechFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    let mounted = true;
    const loadIntegrations = async () => {
      try {
        const { data } = await api.get('/integrations/');
        const rows = Array.isArray(data) ? data : data?.results || [];
        const fieldroutes = rows.find((r) => String(r?.provider || '').toLowerCase() === 'fieldroutes');
        if (mounted) setOpsMode(Boolean(fieldroutes?.enabled));
      } catch {
        if (mounted) setOpsMode(false);
      }
    };
    void loadIntegrations();
    const onTenantChanged = () => loadIntegrations();
    window.addEventListener('activeTenant:changed', onTenantChanged);
    return () => {
      mounted = false;
      window.removeEventListener('activeTenant:changed', onTenantChanged);
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const cacheKey = `${opsMode ? 'ops_dispatch' : 'dispatch'}:${day}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.at < 45_000) {
        setTechnicians(cached.technicians);
        setServiceTypes(cached.serviceTypes);
        setEvents(cached.events);
        setLoading(false);
        return;
      }

      const fetchPaged = async (request) => {
        const first = await request();
        const initial = first.data;
        let rows = normalizeArray(initial);
        let next = initial?.next;
        while (next) {
          const { data } = await api.get(next);
          rows = rows.concat(normalizeArray(data));
          next = data?.next;
        }
        return rows;
      };

      if (opsMode) {
        const [techRows, scheduleRows] = await Promise.all([
          fetchPaged(() => listOperationalTechnicians({ page_size: 250, active: true })).catch(() => []),
          fetchPaged(() => listOperationalSchedules({ day, page_size: 800 })).catch(() => []),
        ]);

        setTechnicians(Array.isArray(techRows) ? techRows : []);
        setServiceTypes([]);

        const mapped = [];
        scheduleRows.forEach((row) => {
          const start = toDate(row.start);
          const end = toDate(row.end);
          if (!start || !end) return;
          const customerName = clean(row.customerName) || 'Customer';
          const serviceName = clean(row.serviceName) || 'Service';
          const techName = clean(row.techName) || 'Unassigned';
          const resourceId = clean(row.resourceId) || 'unassigned';
          const windowLabel = `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`;
          const customerId = clean(row.customerId);
          mapped.push({
            id: row.id,
            row,
            start,
            end,
            resourceId,
            title: `${customerName} • ${serviceName}`,
            customerId,
            customerHref: customerId ? `/customers/fr/${encodeURIComponent(customerId)}` : '',
            customerName,
            serviceName,
            techName,
            status: row.status || 'scheduled',
            address: row.address,
            city: row.city,
            state: row.state,
            notes: row.notes || '',
            windowLabel,
          });
        });

        setEvents(mapped);
        cacheRef.current.set(cacheKey, {
          at: Date.now(),
          technicians: Array.isArray(techRows) ? techRows : [],
          serviceTypes: [],
          events: mapped,
        });
        return;
      }

      // Preferred for operations: dispatch_board is day-scoped and fast.
      // We also fetch a limited schedules page to enrich stops with notes/status/metadata.
      const [boardRes, schedulesRes, techRes, serviceRes] = await Promise.all([
        getDispatchBoard({ day, include_opportunities: true }).catch(() => ({ data: null })),
        listSchedules({ page_size: 500 }).catch(() => ({ data: [] })),
        listTechnicians({ page_size: 200 }).catch(() => ({ data: [] })),
        listServiceTypes({ page_size: 250 }).catch(() => ({ data: [] })),
      ]);

      const techRows = toRows(techRes.data);
      const serviceRows = toRows(serviceRes.data);
      setTechnicians(techRows);
      setServiceTypes(serviceRows);
      const serviceById = new Map(serviceRows.map((s) => [String(s.id), s]));

      const dayStart = new Date(`${day}T00:00:00`);
      const dayEnd = new Date(`${day}T23:59:59`);
      const scheduleRows = toRows(schedulesRes.data).filter((row) => {
        const start = toDate(row.scheduled_start);
        if (!start) return false;
        return start >= dayStart && start <= dayEnd;
      });
      const scheduleById = new Map(scheduleRows.map((r) => [String(r.id), r]));

      const board = boardRes?.data || null;
      const mapped = [];

      const pushStop = (stop, technicianName, technicianId) => {
        const schedule = scheduleById.get(String(stop.schedule_id)) || null;
        const start = toDate(stop.service_window_start || schedule?.scheduled_start);
        const end = toDate(stop.service_window_end || schedule?.scheduled_end);
        if (!start || !end) return;
        const customerName = clean(stop.customer_name) || clean(schedule?.customer_name) || 'Customer';
        const serviceTypeId = schedule?.service_type != null ? String(schedule.service_type) : '';
        const serviceName = clean(serviceById.get(serviceTypeId)?.name) || clean(schedule?.offering_name) || 'Service';
        const techName = clean(technicianName) || clean(schedule?.assigned_technician_name) || 'Unassigned';
        const resourceId = technicianId ? String(technicianId) : 'unassigned';
        const status = schedule?.status || 'pending';

        const windowLabel = `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`;
        const event = {
          id: stop.schedule_id,
          row: schedule || stop,
          start,
          end,
          resourceId,
          title: `${customerName} • ${serviceName}`,
          customerId: stop.customer_id,
          customerName,
          serviceName,
          techName,
          status,
          address: stop.address,
          city: stop.city,
          state: stop.state,
          notes: schedule?.notes || '',
          windowLabel,
          onComplete: async () => {
            try {
              await updateSchedule(stop.schedule_id, { status: 'completed' });
              await load();
            } catch {
              setError('Unable to mark completed.');
            }
          },
          onCancel: async () => {
            try {
              await cancelSchedule(stop.schedule_id);
              await load();
            } catch {
              setError('Unable to cancel schedule.');
            }
          },
        };
        mapped.push(event);
      };

      if (board && Array.isArray(board.routes)) {
        board.routes.forEach((route) => {
          (route.stops || []).forEach((stop) => pushStop(stop, route.technician_name, route.technician_id));
        });
        (board.unassigned || []).forEach((stop) => pushStop(stop, 'Unassigned', null));
      } else {
        // Fallback: show whatever schedules we can (limited to page_size above).
        scheduleRows.forEach((row) => {
          const start = toDate(row.scheduled_start);
          const end = toDate(row.scheduled_end);
          if (!start || !end) return;
          const customerName = clean(row.customer_name) || 'Customer';
          const serviceTypeId = row?.service_type != null ? String(row.service_type) : '';
          const serviceName = clean(serviceById.get(serviceTypeId)?.name) || 'Service';
          const techId = row?.assigned_technician != null ? String(row.assigned_technician) : 'unassigned';
          mapped.push({
            id: row.id,
            row,
            start,
            end,
            resourceId: techId,
            title: `${customerName} • ${serviceName}`,
            customerName,
            serviceName,
            techName: clean(row.assigned_technician_name) || 'Unassigned',
            status: row.status || 'pending',
            notes: row.notes || '',
            windowLabel: `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
          });
        });
      }

      setEvents(mapped);
      cacheRef.current.set(cacheKey, { at: Date.now(), technicians: techRows, serviceTypes: serviceRows, events: mapped });
    } catch (err) {
      setError(err?.message || 'Unable to load schedule data.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    load();
  }, [day, opsMode]);

  const unassignedCount = useMemo(
    () => events.filter((event) => clean(event.techName).toLowerCase() === 'unassigned').length,
    [events]
  );

  const resources = useMemo(() => {
    const rows = toRows(technicians).map((t) =>
      opsMode
        ? {
            id: String(t.technician_id || t.external_id || t.id || ''),
            title: t.technician_name || t.name || `Tech ${t.technician_id || t.external_id || ''}`,
          }
        : {
            id: String(t.user),
            title: t.user_name || `Tech ${t.user}`,
          }
    );
    const base = [{ id: 'unassigned', title: 'Unassigned' }, ...rows];
    return base;
  }, [opsMode, technicians]);

  const filteredEvents = useMemo(() => {
    if (techFilter === 'all') return events;
    return events.filter((e) => String(e.resourceId) === String(techFilter));
  }, [events, techFilter]);

  const handleDrop = async ({ event, start, end, resourceId }) => {
    const prev = { start: event.start, end: event.end, resourceId: event.resourceId };
    const nextResource = resourceId != null ? String(resourceId) : String(event.resourceId || 'unassigned');
    const optimistic = { ...event, start, end, resourceId: nextResource };
    setEvents((prevEvents) => prevEvents.map((e) => (e.id === event.id ? optimistic : e)));
    try {
      const tasks = [];
      tasks.push(reschedule(event.id, { start: start.toISOString(), end: end.toISOString() }));
      if (nextResource !== String(prev.resourceId || 'unassigned')) {
        tasks.push(
          updateSchedule(event.id, {
            assigned_technician: nextResource === 'unassigned' ? null : Number.isNaN(Number(nextResource)) ? nextResource : Number(nextResource),
          })
        );
      }
      await Promise.all(tasks);
      setEvents((prevEvents) =>
        prevEvents.map((entry) =>
          entry.id === event.id
            ? { ...entry, start, end, resourceId: nextResource, windowLabel: `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}` }
            : entry
        )
      );
    } catch {
      setError('Drag-and-drop update failed. Please retry.');
      setEvents((prevEvents) =>
        prevEvents.map((e) => (e.id === event.id ? { ...e, start: prev.start, end: prev.end, resourceId: prev.resourceId } : e))
      );
    }
  };

  const assignFirstUnassigned = async () => {
    if (opsMode) {
      setError('Operational schedules are currently read-only (FieldRoutes).');
      return;
    }
    const target = events.find((event) => clean(event.techName).toLowerCase() === 'unassigned');
    if (!target || !technicians.length) return;
    const assignee = technicians[0];
    try {
      await updateSchedule(target.id, { assigned_technician: assignee.user || assignee.user_id || assignee.id });
      await load();
    } catch {
      setError('Unable to assign technician.');
    }
  };

  return (
    <div className='calendar-wrapper'>
      <header className='calendar-head'>
        <div>
          <h2>Scheduling Calendar</h2>
          <p>Technician lanes, drag and drop scheduling, and route-aware dispatch. Default view is day-ops.</p>
        </div>
        <div className='calendar-head-actions'>
          <button type='button' onClick={() => setView('day')}>
            <CalendarDays size={14} />
            Day
          </button>
          <button type='button' onClick={() => setView('week')}>
            <CalendarDays size={14} />
            Week
          </button>
          <button type='button' onClick={() => setView('month')}>
            <CalendarDays size={14} />
            Month
          </button>
          <button type='button' onClick={() => setView('agenda')}>
            <Route size={14} />
            Route View
          </button>
        </div>
      </header>

      <div className='calendar-metrics'>
        <div className='calendar-metric'>
          <span>Appointments Loaded</span>
          <strong>{events.length}</strong>
        </div>
        <div className='calendar-metric'>
          <span>Unassigned</span>
          <strong>{unassignedCount}</strong>
        </div>
        <div className='calendar-metric'>
          <span>Day</span>
          <strong>
            <input
              className='calendar-day'
              type='date'
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label='Select day'
            />
          </strong>
        </div>
        <div className='calendar-metric'>
          <span>Technician</span>
          <strong>
            <select className='calendar-filter' value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
              <option value='all'>All</option>
              {resources
                .filter((r) => r.id !== 'unassigned')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
          </strong>
        </div>
        <button type='button' className='calendar-assign-btn' onClick={assignFirstUnassigned} disabled={opsMode}>
          <Users size={14} />
          Auto-assign Next
        </button>
        <button type='button' className='calendar-assign-btn secondary' onClick={load}>
          <RefreshCw size={14} />
          Refresh
        </button>
        <a className='calendar-assign-btn secondary' href='/schedule/day'>
          <MapPinned size={14} />
          Dispatch
        </a>
      </div>

      {loading ? <div className='calendar-status'>Loading appointments…</div> : null}
      {error ? <div className='calendar-status error'>{error}</div> : null}

      {opsMode ? (
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor='start'
          endAccessor='end'
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          defaultView='week'
          style={{ height: '75vh' }}
          components={{ event: EventCard }}
          onSelectEvent={(event) => setSelected(event)}
          popup
          resources={resources}
          resourceIdAccessor='id'
          resourceTitleAccessor='title'
          resourceAccessor='resourceId'
          eventPropGetter={(event) => ({
            style: {
              background: `${eventColor(event.status)}22`,
              border: `1px solid ${eventColor(event.status)}`,
              borderRadius: '10px',
              color: 'var(--text-main)',
              boxShadow: 'none',
            },
          })}
        />
      ) : (
        <DnDCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor='start'
          endAccessor='end'
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          defaultView='week'
          style={{ height: '75vh' }}
          components={{ event: EventCard }}
          onSelectEvent={(event) => setSelected(event)}
          onEventDrop={handleDrop}
          onEventResize={handleDrop}
          resizable
          popup
          resources={resources}
          resourceIdAccessor='id'
          resourceTitleAccessor='title'
          resourceAccessor='resourceId'
          eventPropGetter={(event) => ({
            style: {
              background: `${eventColor(event.status)}22`,
              border: `1px solid ${eventColor(event.status)}`,
              borderRadius: '10px',
              color: 'var(--text-main)',
              boxShadow: 'none',
            },
          })}
        />
      )}

      {selected ? (
        <div className='calendar-modal' role='dialog' aria-modal='true'>
          <div className='calendar-modal-surface'>
            <header className='calendar-modal-head'>
              <div>
                <strong>{selected.customerName}</strong>
                <div className='muted'>{selected.serviceName}</div>
              </div>
              <button type='button' className='calendar-modal-close' onClick={() => setSelected(null)}>
                Close
              </button>
            </header>
            <div className='calendar-modal-body'>
              <div className='calendar-modal-actions'>
                {selected.onComplete ? (
                  <button type='button' className='calendar-assign-btn' onClick={() => selected.onComplete?.()}>
                    Complete
                  </button>
                ) : null}
                {selected.onCancel ? (
                  <button type='button' className='calendar-assign-btn secondary' onClick={() => selected.onCancel?.()}>
                    Cancel
                  </button>
                ) : null}
                {selected.customerHref || selected.customerId ? (
                  <a
                    className='calendar-assign-btn secondary'
                    href={selected.customerHref || `/customers/${encodeURIComponent(selected.customerId)}`}
                  >
                    Open Customer
                  </a>
                ) : null}
              </div>
              <KeyValueGrid title='Schedule Fields' data={selected.row || selected} />
            </div>
          </div>
          <button className='calendar-modal-backdrop' onClick={() => setSelected(null)} aria-label='Close' />
        </div>
      ) : null}
    </div>
  );
}
