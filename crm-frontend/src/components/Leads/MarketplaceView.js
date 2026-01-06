import React, { useEffect, useState } from 'react';
import './MarketplaceView.css';

const MarketplaceView = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://127.0.0.1:808/api/leads/crm-leads/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const allLeads = Array.isArray(data) ? data : data.results || [];
        const underContract = allLeads.filter(lead => lead.status === 'under_contract');
        setLeads(underContract);
      } catch (err) {
        console.error('Error loading leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="marketplace-view">
      <h1 className="marketplace-title">Properties Under Contract</h1>
      {loading ? (
        <p>Loading...</p>
      ) : leads.length === 0 ? (
        <p>No properties currently under contract.</p>
      ) : (
        <div className="property-grid">
          {leads.map((lead) => (
            <div key={lead.id} className="property-card">
              <div className="property-header">
                <h3>{lead.name || 'Unnamed Property'}</h3>
                <p className="price">${lead.estimated_price || '--'}</p>
              </div>
              <p className="address">{lead.address || 'No address available'}</p>
              <p className="meta">Updated: {lead.updated_at?.slice(0, 10)}</p>
              <div className="market-actions">
                <button>View Offer</button>
                <button>Send to Buyers</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
