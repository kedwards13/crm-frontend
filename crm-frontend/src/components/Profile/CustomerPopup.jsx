import React, { useState, useEffect, useRef } from 'react';
import './CustomerPopup.css';

import InfoTab from './ProfileTabs/InfoTab';
import DocumentsTab from './ProfileTabs/DocumentsTab';
import ContractsTab from './ProfileTabs/ContractsTab';
import TasksTab from './ProfileTabs/TasksTab';
import AiTab from './ProfileTabs/AiTab';
import CommunicationsTab from './ProfileTabs/CommunicationsTab';

import { toast } from 'react-toastify';

function CustomerPopup({ lead, leadType = 'crm', onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [updatedLead, setUpdatedLead] = useState(null);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { sender: 'ai', text: 'Analyzing this record for insights...' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (!lead || !lead.id) return;
    setUpdatedLead({
      ...lead,
      source: lead.source || leadType || 'crm'
    });
    setIsCustomer(leadType === 'crm' || !!lead.status);
  }, [lead, leadType]);

  if (!updatedLead) {
    return (
      <div className="popup-overlay">
        <div className="popup loading-popup">Loading customer data...</div>
      </div>
    );
  }

  const industry = updatedLead.industry || 'general';
  const displayName = updatedLead.name || updatedLead.customer_name || 'Lead Details';

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
  const QUOTE_STATUSES = [
    { key: 'draft', label: 'Draft' },
    { key: 'partial', label: 'Partial' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'converted', label: 'Converted' },
    { key: 'completed', label: 'Completed' },
    { key: 'renewal_due', label: 'Renewal Due' },
  ];
  const STATUS_OPTIONS = leadType === 'revival' ? QUOTE_STATUSES : PIPELINE_STATUSES;

  const API_BASE = process.env.REACT_APP_API_BASE || 'https://os.abon.ai';
  const apiPaths = {
    crm: {
      update: `${API_BASE}/api/leads/crm-leads/${updatedLead.id}/`,
      transfer: null,
    },
    lead: {
      update: null,
      transfer: `${API_BASE}/api/leads/transfer-lead/`,
    },
    revival: {
      update: `${API_BASE}/api/revival/scanner/${updatedLead.id}/`,
      transfer: `${API_BASE}/api/revival/transfer/`,
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedLead(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      const updateUrl = apiPaths[leadType]?.update;
      if (!updateUrl) throw new Error('No update path for this lead type.');

      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatedLead),
      });

      if (!res.ok) throw new Error('Save API failed');
      toast.success('Changes saved successfully.');
    } catch (err) {
      console.error('❌ Save error:', err);
      toast.error('Failed to save changes.');
    }
  };

  const handleSaveAsCustomer = async () => {
    try {
      const res = await fetch(apiPaths[leadType]?.transfer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ lead_id: lead.id }),
      });

      if (!res.ok) throw new Error('Transfer API failed');
      const data = await res.json();

      setUpdatedLead(prev => ({
        ...prev,
        id: data.crm_lead_id,
        status: 'new',
        industry: data.industry || prev.industry,
      }));
      setIsCustomer(true);
      toast.success('Lead transferred to CRM.');
    } catch (err) {
      console.error('❌ Transfer failed:', err);
      toast.error('Transfer to CRM failed.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const updateUrl = apiPaths[leadType]?.update;
      if (!updateUrl) throw new Error('No update path for this type.');

      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...updatedLead, status: newStatus }),
      });

      if (!res.ok) throw new Error('Status update API failed');
      setUpdatedLead(prev => ({ ...prev, status: newStatus }));
      setShowStatusPopup(false);
      toast.success('Status updated.');
    } catch (err) {
      console.error('❌ Status update failed:', err);
      toast.error('Status update failed.');
    }
  };

  const safeRender = (Component, props = {}) => {
    try {
      return Component ? <Component {...props} /> : null;
    } catch (err) {
      console.error(`🚨 Error rendering ${Component?.name || 'Unknown'}:`, err);
      return (
        <div className="p-4 text-red-400 bg-red-800/20 rounded-md">
          Error loading {Component?.name}
        </div>
      );
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup rounded-xl shadow-lg">
        {/* Header */}
        <div className="popup-header bg-gradient-to-r from-gray-800 to-gray-700 px-4 py-3 flex justify-between items-center text-white rounded-t-xl">
          <h2 className="text-xl font-semibold">{displayName}</h2>
          <button className="close-btn text-white text-lg" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <nav className="popup-navbar flex gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm font-medium text-gray-300">
          {['info', 'contracts', 'documents', 'tasks', 'ai', 'communications'].map(tab => (
            <button
              key={tab}
              className={`px-3 py-1 rounded-md ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="popup-content scroll-area p-4">
          {activeTab === 'info' && safeRender(InfoTab, { lead: updatedLead, onChange: handleChange, industry })}
          {activeTab === 'contracts' && safeRender(ContractsTab, { lead: updatedLead, industry })}
          {activeTab === 'documents' && safeRender(DocumentsTab, { lead: updatedLead, industry })}
          {activeTab === 'tasks' && safeRender(TasksTab, { lead: updatedLead, industry })}
          {activeTab === 'ai' && safeRender(AiTab, {
            aiMessages,
            aiInput,
            setAiInput,
            setAiMessages,
            chatRef
          })}
          {activeTab === 'communications' && safeRender(CommunicationsTab, { lead: updatedLead, industry })}
        </div>

        {/* Actions */}
        <div className="popup-actions flex justify-end gap-3 px-4 py-3 border-t border-gray-700 bg-gray-800 rounded-b-xl">
          {!isCustomer && apiPaths[leadType]?.transfer ? (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md" onClick={handleSaveAsCustomer}>
              Save to CRM
            </button>
          ) : (
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md" onClick={handleSaveChanges}>
              Save Changes
            </button>
          )}
          {(leadType === 'crm' || leadType === 'revival') && (
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md" onClick={() => setShowStatusPopup(true)}>
              Update Status
            </button>
          )}
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Status Modal */}
        {showStatusPopup && (
          <div className="status-popup fixed top-0 left-0 w-full h-full bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-white text-lg mb-4">Change Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.key}
                    className="bg-gray-700 hover:bg-blue-600 text-white py-2 rounded"
                    onClick={() => handleUpdateStatus(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 text-sm text-gray-400 hover:text-white"
                onClick={() => setShowStatusPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerPopup;