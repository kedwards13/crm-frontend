// src/components/Dashboards/Widgets/CalendarView.js
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { listSchedules } from '../../api/schedulingApi';
import { getIndustryKey, getSchedulingConfig } from '../../constants/uiRegistry';
import './CalendarView.css';

const localizer = momentLocalizer(moment);

/**
 * Mapping from a color name to background & glow styles.
 * You can add or change these to fit your theme.
 */
const colorStyles = {
  blue: {
    background: '#0a84ff',
    glow: '0 0 8px rgba(10,132,255,0.7)',
  },
  orange: {
    background: '#ff9f0a',
    glow: '0 0 8px rgba(255,159,10,0.7)',
  },
  red: {
    background: '#ff453a',
    glow: '0 0 8px rgba(255,69,58,0.7)',
  },
  purple: {
    background: '#bf5af2',
    glow: '0 0 8px rgba(191,90,242,0.7)',
  },
  green: {
    background: '#30d158',
    glow: '0 0 8px rgba(48,209,88,0.7)',
  },
  default: {
    background: '#5e5ce6',
    glow: '0 0 8px rgba(94,92,230,0.7)',
  },
};

const CalendarView = () => {
  const industryKey = getIndustryKey('general');
  const schedulingConfig = getSchedulingConfig(industryKey);
  const defaultDurationMins = schedulingConfig.defaultDurationMins || 60;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await listSchedules();
        const rows = Array.isArray(data) ? data : data?.results || [];
        const mapped = rows
          .map((sched) => {
            const startRaw = sched.scheduled_start || sched.start || sched.start_at;
            const endRaw = sched.scheduled_end || sched.end || sched.end_at;
            if (!startRaw) return null;
            const start = new Date(startRaw);
            if (Number.isNaN(start.getTime())) return null;
            const rawEnd = endRaw ? new Date(endRaw) : null;
            const end =
              rawEnd && !Number.isNaN(rawEnd.getTime())
                ? rawEnd
                : new Date(start.getTime() + defaultDurationMins * 60000);

            const customer = sched.customer || {};
            const customerName =
              typeof customer === 'object'
                ? customer.full_name ||
                  customer.name ||
                  [customer.first_name, customer.last_name].filter(Boolean).join(' ')
                : customer
                ? `Customer ${customer}`
                : '';
            const serviceName =
              sched.service_type?.name ||
              sched.service_type?.title ||
              sched.service_type_name ||
              sched.offering?.name ||
              sched.service_type;

            const title = [customerName || 'Appointment', serviceName]
              .filter(Boolean)
              .join(' • ');

            return {
              id: sched.id,
              title,
              start,
              end,
              status: sched.status || 'pending',
            };
          })
          .filter(Boolean);

        if (mounted) setEvents(mapped);
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load appointments.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [defaultDurationMins]);

  const eventStyleGetter = (event) => {
    const status = (event.status || '').toLowerCase();
    const statusColor =
      status === 'completed' ? 'green' :
      status === 'canceled' ? 'red' :
      status === 'cancelled' ? 'red' :
      status === 'in_progress' ? 'orange' :
      status === 'pending' ? 'orange' :
      status === 'no_show' ? 'purple' :
      status === 'confirmed' ? 'blue' :
      'blue';
    const styleObj = colorStyles[statusColor] || colorStyles.default;
    return {
      style: {
        background: styleObj.background,
        borderRadius: '6px',
        opacity: 0.9,
        color: '#fff',
        border: 'none',
        boxShadow: styleObj.glow,
      },
    };
  };

  return (
    <div className="calendar-wrapper">
      {loading && <div className="calendar-status">Loading appointments…</div>}
      {error && <div className="calendar-status error">{error}</div>}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={['month', 'week', 'day', 'agenda']}
        style={{ height: '75vh' }}
        eventPropGetter={eventStyleGetter}
        popup
      />
    </div>
  );
};

export default CalendarView;
