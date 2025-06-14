// src/components/Layout/TopBar.js
import React from 'react';
import GlobalSearch from '../GlobalSearch';
import { FiInbox } from 'react-icons/fi';
import FloatingSubNav from './FloatingSubNav'; // Import your subnav
import './TopBar.css';

const TopBar = ({
  onSearchSelect,
  inboxCount,
  tabs = [],
  activeTab,
  onTabChange,
}) => {
  return (
    <header className="top-bar">
      {/* LEFT: global search */}
      <div className="top-bar-search">
        <GlobalSearch onSelect={onSearchSelect} />
      </div>

      {/* CENTER: subnav tabs */}
      {tabs.length > 0 && (
        <div className="top-bar-subnav">
          {/* Instead of .sub-nav class, we'll just reuse the buttons from FloatingSubNav */}
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`subnav-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* RIGHT: inbox icon */}
      <div className="top-bar-inbox">
        <FiInbox size={24} />
        {inboxCount > 0 && <span className="inbox-count">{inboxCount}</span>}
      </div>
    </header>
  );
};

export default TopBar;