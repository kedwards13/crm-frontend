// src/components/Dashboards/Widgets/PipelineWidget.js
import React from 'react';
import './PipelineWidget.css';

const PipelineWidget = ({ status }) => {
  // Simulated data based on status prop.
  const getDataForStatus = (status) => {
    switch (status) {
      case "New":
        return { count: 12 };
      case "Qualified":
        return { count: 8 };
      case "Proposed":
        return { count: 5 };
      case "Closed":
        return { count: 3 };
      default:
        return { count: 0 };
    }
  };

  // Return the appropriate CSS class based on the status.
  const getClassForStatus = (status) => {
    switch (status.toLowerCase()) {
      case "new":
        return "count-new";
      case "qualified":
        return "count-qualified";
      case "proposed":
        return "count-proposed";
      case "closed":
        return "count-closed";
      default:
        return "";
    }
  };

  const data = getDataForStatus(status);
  const className = getClassForStatus(status);

  return (
    <div className="pipeline-widget card">
      <h3 className="pipeline-title">{status} </h3>
      <div className="pipeline-content">
        <div className={`pipeline-count ${className}`}>
          {data.count}
        </div>
        <div className="pipeline-label"></div>
      </div>
    </div>
  );
};

export default PipelineWidget;