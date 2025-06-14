// src/components/Dashboards/Widgets/ActivityWidget.js
import React from 'react';
import './ActivityWidget.css';

const ActivityWidget = () => {
  // Sample activity data; update as needed
  const activities = [
    {
      id: 1,
      text: 'Missed call from +15551234567',
      time: '10:15 AM',
    },
    {
      id: 2,
      text: 'Sale: Closed sale: John Doe',
      time: '11:45 AM',
    },
    {
      id: 3,
      text: 'Missed call from +15559876543',
      time: '2:10 PM',
    },
  ];

  return (
    <div className="activity-widget widget card">
      <h3>Activity Feed</h3>
      <ul className="activity-feed">
        {activities.map((activity) => (
          <li key={activity.id} className="activity-item">
            <div className="activity-text">{activity.text}</div>
            <div className="activity-time">{activity.time}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityWidget;