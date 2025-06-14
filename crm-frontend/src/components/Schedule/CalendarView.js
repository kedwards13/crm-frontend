// src/components/Dashboards/Widgets/CalendarView.js
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
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
  const [events, setEvents] = useState([]);

  // Simulate fetching events from an API or backend
  useEffect(() => {
    // More sample events with single-color neon glows
    const sampleEvents = [
      {
        title: 'Client Meeting',
        start: new Date(2025, 2, 30, 10, 0),
        end: new Date(2025, 2, 30, 11, 0),
        color: 'blue',
      },
      {
        title: 'Team Standup',
        start: new Date(2025, 2, 31, 9, 30),
        end: new Date(2025, 2, 31, 10, 0),
        color: 'green',
      },
      {
        title: 'Product Demo',
        start: new Date(2025, 3, 1, 14, 0),
        end: new Date(2025, 3, 1, 15, 30),
        color: 'orange',
      },
      {
        title: 'Design Review',
        start: new Date(2025, 3, 2, 11, 0),
        end: new Date(2025, 3, 2, 12, 0),
        color: 'purple',
      },
      {
        title: 'System Upgrade',
        start: new Date(2025, 3, 3, 16, 0),
        end: new Date(2025, 3, 3, 17, 30),
        color: 'red',
      },
    ];
    setEvents(sampleEvents);
  }, []);

  // Returns style props for each event based on colorStyles
  const eventStyleGetter = (event) => {
    const styleObj = colorStyles[event.color] || colorStyles.default;
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