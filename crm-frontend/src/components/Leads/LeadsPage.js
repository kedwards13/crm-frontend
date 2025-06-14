// src/components/Leads/LeadsPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TianLeads from './TianLeads';
import CustomerPopup from '../Profile/CustomerPopup';
import Assistant from '../Assistant/Assistant';
import './LeadsPage.css';
import '../Dashboards/Widgets/PipelineWidget.css';

const LeadsPage = () => {
  const navigate = useNavigate();
  const [tianLeads, setTianLeads] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchAllLeads = async () => {
      setLoading(true);
      try {
        const [resTian, resCRM] = await Promise.all([
          fetch(`http://127.0.0.1:808/api/leads/tian-leads/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://127.0.0.1:808/api/leads/crm-leads/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const tianData = await resTian.json();
        const crmData = await resCRM.json();
        setTianLeads(Array.isArray(tianData) ? tianData : tianData.results || []);
        setCrmLeads(Array.isArray(crmData) ? crmData : crmData.results || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load leads. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllLeads();
  }, [token, navigate]);

  const handleLeadClick = (lead) => setSelectedLead(lead);
  const getCountByStatus = (status) =>
    crmLeads.filter((lead) => lead.status === status).length;

  const pipelineCards = [
    { label: 'New', key: 'new', className: 'count-new' },
    { label: 'Qualified', key: 'qualified', className: 'count-qualified' },
    { label: 'Offered', key: 'offered', className: 'count-proposed' },
    { label: 'Under Contract', key: 'under_contract', className: 'count-proposed' },
    { label: 'Closed', key: 'closed', className: 'count-closed' },
    { label: 'Disqualified', key: 'dead', className: 'count-closed' },
  ];

  return (
    <div className="leads-page">
      <div className="leads-layout">
        {/* === LEFT: Full Lead List === */}
        <div className="leads-list-panel">
          <h2 className="lead-section-title">New Leads</h2>
          {loading && <p className="loading">Loading...</p>}
          {error && <p className="error">{error}</p>}
          <div className="lead-grid">
            <TianLeads leads={tianLeads} onLeadClick={handleLeadClick} />
          </div>
        </div>
  
        {/* === RIGHT: AI + Pipeline === */}
        <div className="leads-right-panel">
          <div className="ai-assistant-box">
            <Assistant context="leads" />
          </div>
  
          <div className="pipeline-2col">
            {pipelineCards.map(({ label, key, className }) => (
              <div key={key} className="pipeline-widget" onClick={() => navigate(`/pipeline?status=${key}`)}>
                <div className={`pipeline-count ${className}`}>{getCountByStatus(key)}</div>
                <div className="pipeline-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
  
      {selectedLead && (
        <CustomerPopup
          lead={selectedLead}
          leadType="pipeline"
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};

export default LeadsPage;