import React, { useState, useEffect } from 'react';
import './Pipeline.css';

const PIPELINE_STAGES = [
  { key: 'new', label: 'New Leads' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'offered', label: 'Offered' },
  { key: 'under_contract', label: 'Under Contract' },
  { key: 'closed', label: 'Closed Deals' },
  { key: 'dead', label: 'Disqualified' },
];

const Pipeline = ({ onLeadClick }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem('token');

      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:808/api/leads/crm-leads/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setLeads(data);
        } else {
          throw new Error('Unexpected response format');
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching leads:', err);
        setError('Failed to load leads. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="pipeline-container">
      <div className="pipeline-header">
        <h1>Deals Pipeline</h1>
      </div>

      <div className="pipeline-board">
        {loading && <p className="loading">Loading leads...</p>}
        {error && <p className="error">{error}</p>}

        {!loading &&
          !error &&
          PIPELINE_STAGES.map((stage) => (
            <div className="pipeline-column" key={stage.key}>
              <div className="column-header">
                <h2>{stage.label}</h2>
                <span className="column-count">{leads.filter((lead) => lead.status === stage.key).length}</span>
              </div>
              <div className="lead-list">
                {leads
                  .filter((lead) => lead.status === stage.key)
                  .map((lead) => (
                    <div
                      key={lead.id}
                      className="lead-card"
                      onClick={() => onLeadClick(lead)}
                    >
                      <h3>{lead.name || 'No Name'}</h3>
                      <p><b>Status:</b> {stage.label}</p>
                      <p className="lead-date">Last Updated: Jan 28, 2025</p>
                      <div className="lead-footer">
                        <div className="lead-avatar"></div>
                        <span className="lead-value">$500,000</span>
                      </div>
                    </div>
                  ))}
                {leads.filter((lead) => lead.status === stage.key).length === 0 && (
                  <p className="no-leads">No leads in this stage.</p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Pipeline;