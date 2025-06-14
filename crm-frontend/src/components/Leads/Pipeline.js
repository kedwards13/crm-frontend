import React, { useState, useEffect } from 'react';
import Assistant from '../Assistant/Assistant';
import CustomerPopup from '../Profile/CustomerPopup';
import { getIndustry } from '../../utils/tenantHelpers';
import './Pipeline.css';

const PIPELINE_STAGES = [
  { key: 'new', label: 'New Leads' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'offered', label: 'Offer Sent' },
  { key: 'under_contract', label: 'Under Contract' },
  { key: 'closed', label: 'Closed Deals' },
  { key: 'dead', label: 'Disqualified' },
];

const PipelineView = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState(null);
  const industry = getIndustry();

  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://127.0.0.1:808/api/leads/crm-leads/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error('Failed to load leads:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  if (!['wholesaler', 'real_estate'].includes(industry)) {
    return <div className="pipeline-view"><p>🚫 This feature is not available for your industry.</p></div>;
  }

  return (
    <div className="pipeline-view">
      <div className="pipeline-header">
        <h1>Deals Pipeline</h1>
      </div>

      {/* === AI Assistant Panel on Top === */}
      <div className="pipeline-ai-top">
        <Assistant context="pipeline" tianLeads={leads} />
      </div>

      {/* === Vertical Stacked Pipeline Stages === */}
      <div className="pipeline-vertical">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = leads
            .filter((lead) => lead.status === stage.key)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Newest first

          return (
            <div key={stage.key} className="pipeline-stage">
              <div className="pipeline-stage-header">
                <h3>{stage.label}</h3>
                <span className="count">{stageLeads.length}</span>
              </div>
              {stageLeads.length === 0 ? (
                <p className="pipeline-empty">No leads in this stage.</p>
              ) : (
                <div className="pipeline-lead-row">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="lead-card"
                      onClick={() => setActiveLead(lead)}
                    >
                      <div className="lead-header">
                        <strong>{lead.name || 'Unnamed'}</strong>
                        <span className="lead-price">${lead.estimated_price || '--'}</span>
                      </div>
                      <p className="lead-meta">Updated: {lead.updated_at?.slice(0, 10)}</p>
                      <div className="lead-tags">
                        <span>{lead.source || 'Website'}</span>
                        <span>Status: {lead.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeLead && (
        <CustomerPopup
          lead={activeLead}
          leadType="pipeline"
          onClose={() => setActiveLead(null)}
        />
      )}
    </div>
  );
};

export default PipelineView;