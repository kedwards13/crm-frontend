// src/components/TabContent.js
import React from 'react';
import GoogleMapsEmbed from '../../utils/GoogleMapsEmbed';
import './CustomerPopup.css';

function TabContent({ tab, lead }) {
  switch (tab) {
    case 'info':
      return (
        <section>
          <h3>Basic Information</h3>
          <p><b>Name:</b> {lead.name || 'N/A'}</p>
          <p><b>Phone:</b> {lead.phone_number || 'N/A'}</p>
          <p><b>Email:</b> {lead.email || 'N/A'}</p>
          <p><b>Address:</b> {lead.address}</p>
          <p><b>Property Type:</b> {lead.property_type}</p>
          <p><b>Asking Price:</b> ${lead.asking_price?.toLocaleString()}</p>
          <GoogleMapsEmbed address={lead.address} />
        </section>
      );

    case 'contracts':
      return (
        <section>
          <h3>Contracts</h3>
          <ul>
            {lead.contracts?.length ? (
              lead.contracts.map((contract, index) => (
                <li key={index}>
                  <a href={contract.url} target="_blank" rel="noopener noreferrer">
                    {contract.name}
                  </a>
                </li>
              ))
            ) : (
              <li>No contracts available</li>
            )}
          </ul>
        </section>
      );

    case 'documents':
      return (
        <section>
          <h3>Documents</h3>
          <ul>
            {lead.documents?.length ? (
              lead.documents.map((doc, index) => (
                <li key={index}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {doc.name}
                  </a>
                </li>
              ))
            ) : (
              <li>No documents available</li>
            )}
          </ul>
        </section>
      );

    case 'photos':
      return (
        <section>
          <h3>Photos</h3>
          <div className="photos-grid">
            {lead.photos?.length ? (
              lead.photos.map((photo, index) => (
                <img key={index} src={photo.url} alt={`Photo ${index}`} />
              ))
            ) : (
              <p>No photos available</p>
            )}
          </div>
        </section>
      );

    case 'recommendations':
      return (
        <section>
          <h3>AI-Powered Recommendations</h3>
          <p><b>Next Step:</b> Consider making an offer or follow-up.</p>
          <button className="ai-btn">Ask AI Agent</button>
        </section>
      );

    case 'tasks':
      return (
        <section>
          <h3>Tasks</h3>
          <button className="task-btn">Update Status</button>
          <button className="task-btn">Call/Text</button>
          <button className="task-btn">Add Task</button>
        </section>
      );

    default:
      return <p>Invalid Tab Selection</p>;
  }
}

export default TabContent;