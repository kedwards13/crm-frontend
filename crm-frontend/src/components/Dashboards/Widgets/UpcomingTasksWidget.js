import React from 'react';

const UpcomingTasksWidget = () => {
  // Example static tasks; later replace with data from your backend
  const tasks = [
    "Call John Doe (10:00 AM)",
    "Meeting with Jane Smith (2:00 PM)",
    "Follow-up with Bob Johnson (4:30 PM)",
  ];

  return (
    <div>
      <h3>Upcoming Tasks</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task, index) => (
          <li key={index} style={{ marginBottom: '10px' }}>
            {task}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UpcomingTasksWidget;