// src/components/TabContent.jsx
import React from 'react';
import GoogleMapsEmbed from '../../utils/GoogleMapsEmbed';
import './CustomerPopup.css';

function formatCurrency(value) {
  if (!value) return 'N/A';
  return `$${Number(value).toLocaleString()}`;
}

function renderIndustryFields(lead, industry) {
  switch (industry) {
    case 'real_estate':
      return (
        <>
          <p><b>Property Type:</b> {lead.property_type || 'N/A'}</p>
          <p><b>Beds:</b> {lead.beds || 'N/A'}</p>
          <p><b>Baths:</b> {lead.bathrooms || 'N/A'}</p>
          <p><b>Condition:</b> {lead.condition || 'N/A'}</p>
          <p><b>Sell Timeline:</b> {lead.sell_timeline || 'N/A'}</p>
          <p><b>Asking Price:</b> {formatCurrency(lead.asking_price)}</p>
        </>
      );
    case 'pest_control':
      return (
        <>
          <p><b>Service Type:</b> {lead.service_type || 'N/A'}</p>
          <p><b>Frequency:</b> {lead.frequency || 'N/A'}</p>
          <p><b>Last Treatment:</b> {lead.last_treatment || 'N/A'}</p>
          <p><b>Notes:</b> {lead.notes || 'N/A'}</p>
        </>
      );
    case 'cleaning':
      return (
        <>
          <p><b>Cleaning Type:</b> {lead.cleaning_type || 'N/A'}</p>
          <p><b>Frequency:</b> {lead.frequency || 'N/A'}</p>
          <p><b>Pets in Home:</b> {lead.pets || 'N/A'}</p>
          <p><b>Special Instructions:</b> {lead.notes || 'N/A'}</p>
        </>
      );
    case 'landscaping':
    case 'construction':
      return (
        <>
          <p><b>Project Type:</b> {lead.project_type || 'N/A'}</p>
          <p><b>Square Footage:</b> {lead.square_footage || 'N/A'}</p>
          <p><b>Budget:</b> {formatCurrency(lead.budget)}</p>
          <p><b>Deadline:</b> {lead.deadline || 'N/A'}</p>
        </>
      );
    default:
      return <p>No industry-specific fields for this lead.</p>;
  }
}

function TabContent({ tab, lead }) {
  const industry = lead?.industry || 'general';

  switch (tab) {
    case 'info':
      return (
        <section>
          <h3>Basic Information</h3>
          <p><b>Name:</b> {lead.name || lead.customer_name || 'N/A'}</p>
          <p><b>Phone:</b> {lead.phone_number || 'N/A'}</p>
          <p><b>Email:</b> {lead.email || 'N/A'}</p>
          <p><b>Address:</b> {lead.address || 'N/A'}</p>
          <GoogleMapsEmbed address={lead.address || ''} />

          <h4>Industry-Specific Details</h4>
          {renderIndustryFields(lead, industry)}
        </section>
      );

    case 'contracts':
      return (
        <section>
          <h3>Contracts</h3>
          <ul>
            {lead.contracts?.length > 0 ? (
              lead.contracts.map((contract, i) => (
                <li key={i}>
                  <a href={contract.url} target="_blank" rel="noopener noreferrer">
                    {contract.name || `Contract ${i + 1}`}
                  </a>
                </li>
              ))
            ) : (
              <li>No contracts available.</li>
            )}
          </ul>
        </section>
      );

    case 'documents':
      return (
        <section>
          <h3>Documents</h3>
          <ul>
            {lead.documents?.length > 0 ? (
              lead.documents.map((doc, i) => (
                <li key={i}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {doc.name || `Document ${i + 1}`}
                  </a>
                </li>
              ))
            ) : (
              <li>No documents available.</li>
            )}
          </ul>
        </section>
      );

    case 'photos':
      return (
        <section>
          <h3>Photos</h3>
          <div className="photos-grid">
            {lead.photos?.length > 0 ? (
              lead.photos.map((photo, i) => (
                <img key={i} src={photo.url} alt={`Photo ${i + 1}`} />
              ))
            ) : (
              <p>No photos available.</p>
            )}
          </div>
        </section>
      );

    case 'recommendations':
      return (
        <section>
          <h3>AI-Powered Recommendations</h3>
          <p><b>Next Step:</b> Consider follow-up or proposal.</p>
          <button className="ai-btn">Ask AI Agent</button>
        </section>
      );

    case 'tasks':
      return (
        <section>
          <h3>Tasks</h3>
          <div className="task-actions">
            <button className="task-btn">Update Status</button>
            <button className="task-btn">Call / Text</button>
            <button className="task-btn">Add Task</button>
          </div>
        </section>
      );

    default:
      return <p>Invalid tab selected.</p>;
  }
}

export default TabContent;