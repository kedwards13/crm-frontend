import React, { useState, useEffect, useRef } from 'react';
import FloatingSubNav from '../Layout/FloatingSubNav';
import PhoneDialer from './PhoneDialer';
import Messages from './Messages';
import Emails from './Emails';
import AIInsightsPanel from './AIInsightsPanel';
import './CommunicationsDashboard.css';

const COMM_TABS = [
  { key: 'dialer', label: 'Phone' },
  { key: 'messages', label: 'Messages' },
  { key: 'emails', label: 'Email' },
];

const CommunicationsDashboard = () => {
  const [activeTab, setActiveTab] = useState('dialer');
  const [callStatus, setCallStatus] = useState('');
  const [error, setError] = useState('');
  const statusTimeoutRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const clearStatusAfterDelay = (delay = 5000) => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setCallStatus(''), delay);
  };

  const handleAddCall = (phoneNumber) => {
    setCallStatus(`Call initiated to ${phoneNumber}`);
    clearStatusAfterDelay();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dialer':
        return (
          <div className="comm-dashboard-main">
            <div className="left-panel">
              <PhoneDialer
                onAddCall={handleAddCall}
                setError={setError}
                setCallStatus={setCallStatus}
              />
            </div>
            <div className="right-panel">
              <AIInsightsPanel />
            </div>
          </div>
        );
      case 'messages':
        return <Messages />;
      case 'emails':
        return <Emails />;
      default:
        return null;
    }
  };

  return (
    <div className="layout-content"> {/* Ensures proper padding/margin inside layout-main */}
      <div className="comm-dashboard-container">
        <FloatingSubNav
          tabs={COMM_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {callStatus && <div className="status-message global-status">{callStatus}</div>}
        {error && <div className="error-message global-error">{error}</div>}

        <div className="comm-dashboard-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CommunicationsDashboard;