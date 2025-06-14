import React, { useState, useEffect, useRef } from 'react';
import './CustomerPopup.css';

import InfoTab from './ProfileTabs/InfoTab';
import DocumentsTab from './ProfileTabs/DocumentsTab';
import ContractsTab from './ProfileTabs/ContractsTab';
import TasksTab from './ProfileTabs/TasksTab';
import AiTab from './ProfileTabs/AiTab';
import CommunicationsTab from './ProfileTabs/CommunicationsTab';

function CustomerPopup({ lead, leadType, onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [updatedLead, setUpdatedLead] = useState({ ...lead });
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { sender: 'ai', text: 'Analyzing this lead for AI insights...' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    setIsCustomer(leadType === 'crm' || lead?.status);
  }, [leadType, lead]);

  const PIPELINE_STATUSES = [
    { key: 'new', label: 'New' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'offered', label: 'Offered' },
    { key: 'follow_up', label: 'Follow-Up' },
    { key: 'accepted_offer', label: 'Accepted Offer' },
    { key: 'under_contract', label: 'Under Contract' },
    { key: 'closed', label: 'Closed' },
    { key: 'dead', label: 'Disqualified' },
  ];

  const handleChange = (e) => {
    setUpdatedLead({
      ...updatedLead,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveAsCustomer = async () => {
    try {
      const res = await fetch('http://127.0.0.1:808/api/leads/transfer-lead/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ lead_id: lead.id }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setUpdatedLead(prev => ({ ...prev, id: data.crm_lead_id, status: 'new' }));
      setIsCustomer(true);
      alert('Lead successfully saved to CRM.');
    } catch {
      alert('Failed to save as customer.');
    }
  };

  const handleSaveChanges = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:808/api/leads/crm-leads/${updatedLead.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatedLead),
      });

      if (!res.ok) throw new Error();
      alert('Changes saved.');
    } catch {
      alert('Error saving.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await fetch(`http://127.0.0.1:808/api/leads/crm-leads/${updatedLead.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...updatedLead, status: newStatus }),
      });
      setUpdatedLead(prev => ({ ...prev, status: newStatus }));
      setShowStatusPopup(false);
      alert('Status updated.');
    } catch {
      alert('Error updating status.');
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup">
        <div className="popup-header">
          <h2 style={{ color: '#fff' }}>{updatedLead.name || 'Lead Details'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <nav className="popup-navbar">
          {['info', 'contracts', 'documents', 'tasks', 'ai', 'communications'].map(tab => (
            <button
              key={tab}
              className={`top-bar-subnav-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <div className="popup-content scroll-area">
          {activeTab === 'info' && (
            <InfoTab lead={updatedLead} onChange={handleChange} />
          )}
          {activeTab === 'contracts' && <ContractsTab lead={updatedLead} />}
          {activeTab === 'documents' && <DocumentsTab lead={updatedLead} />}
          {activeTab === 'tasks' && <TasksTab lead={updatedLead} />}
          {activeTab === 'ai' && (
            <AiTab
              aiMessages={aiMessages}
              aiInput={aiInput}
              setAiInput={setAiInput}
              setAiMessages={setAiMessages}
              chatRef={chatRef}
            />
          )}
          {activeTab === 'communications' && <CommunicationsTab lead={updatedLead} />}
        </div>

        <div className="popup-actions">
          {!isCustomer ? (
            <button className="save-btn" onClick={handleSaveAsCustomer}>Save to CRM</button>
          ) : (
            <button className="save-btn" onClick={handleSaveChanges}>Save Changes</button>
          )}
          <button className="update-btn" onClick={() => setShowStatusPopup(true)}>Update Status</button>
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>

        {showStatusPopup && (
          <div className="status-popup">
            <h3>Change Pipeline Status</h3>
            {PIPELINE_STATUSES.map(s => (
              <button key={s.key} className="status-btn" onClick={() => handleUpdateStatus(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerPopup;