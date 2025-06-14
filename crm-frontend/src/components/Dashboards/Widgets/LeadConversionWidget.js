import React from 'react';

const LeadConversionWidget = () => {
  // Static sample data (replace with dynamic data as needed)
  const newLeads = 10;
  const contacted = 5;
  const underContract = 3;
  const closedDeals = 2;

  return (
    <div>
      <h3>Lead Conversion Stats</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>New Leads: {newLeads}</li>
        <li>Contacted: {contacted}</li>
        <li>Under Contract: {underContract}</li>
        <li>Closed Deals: {closedDeals}</li>
      </ul>
    </div>
  );
};

export default LeadConversionWidget;