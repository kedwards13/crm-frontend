import React from 'react';

const MetricCard = ({ label, value }) => {
  return (
    <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 14, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
};

export default MetricCard;