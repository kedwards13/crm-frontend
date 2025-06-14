import React from 'react';
import './TianLeads.css';

function TianLeads({ leads, onLeadClick }) {
  return (
    <div className="page-wrapper">
      <div className="lead-grid">
        {leads.map((lead, index) => (
          <div
            key={index}
            className="card lead-card"
            onClick={() => onLeadClick(lead)}
          >
            <h3>{lead.name || 'Unnamed Lead'}</h3>
            <p><strong>Phone:</strong> {lead.phone_number}</p>
            <p><strong>Address:</strong> {lead.address}</p>
            <p><strong>Type:</strong> {lead.property_type}</p>
            <p><strong>Price:</strong> ${Number(lead.asking_price).toLocaleString()}</p>

            <div className="lead-actions">
              <button className="btn-save">Save to CRM</button>
              <button className="btn-ai">AI Assist</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TianLeads;