import React, { useEffect, useState } from 'react';
import { listCrmLeads } from '../../api/leadsApi';
import { PIPELINE_STAGE_BOOKED } from '../../constants/pipelineStages';
import { normalizeLead } from '../../utils/normalizeLead';
import './MarketplaceView.css';

const MarketplaceView = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await listCrmLeads({ archived: 'all' });
        const data = res?.data;
        const allLeads = (Array.isArray(data) ? data : data?.results || []).map(normalizeLead);
        const underContract = allLeads.filter(
          (lead) => lead.safePipelineStage === PIPELINE_STAGE_BOOKED || lead.status === 'under_contract'
        );
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
