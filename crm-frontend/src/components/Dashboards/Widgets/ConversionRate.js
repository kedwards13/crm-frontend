/** widgets/ConversionRateWidget.js **/
import React from 'react';

const ConversionRateWidget = () => {
  // Example data
  const conversionRate = 28;
  const delta = 4.5; // e.g., +4.5% from last period

  return (
    <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#fff' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        {conversionRate}%
        <span style={{ fontSize: '1rem', marginLeft: '0.5rem', color: delta >= 0 ? '#30d158' : '#ff3b30' }}>
          {delta >= 0 ? `+${delta}%` : `${delta}%`}
        </span>
      </div>
      <p style={{ fontSize: '1rem', color: '#ccc' }}>Lead Conversion Rate</p>
    </div>
  );
};

export default ConversionRateWidget;