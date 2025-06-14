import React from 'react';

const QuickActionsWidget = () => {
  const handleAction = (action) => {
    // Implement the corresponding action (e.g., open a modal, navigate, etc.)
    console.log(`Quick action triggered: ${action}`);
  };

  return (
    <div>
      <h3>Quick Actions</h3>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
        <button onClick={() => handleAction("Add Lead")}>Add Lead</button>
        <button onClick={() => handleAction("Create Task")}>Create Task</button>
        <button onClick={() => handleAction("Send Bulk Email")}>Send Bulk Email</button>
      </div>
    </div>
  );
};

export default QuickActionsWidget;