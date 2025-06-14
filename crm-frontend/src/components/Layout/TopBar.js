// src/components/Layout/TopBar.js
import React from 'react';
import GlobalSearch from '../GlobalSearch';
import { FiInbox } from 'react-icons/fi';
import './TopBar.css';

const TopBar = ({
  onSearchSelect,
  inboxCount,
  tabs = [],
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="top-bar">
      <div className="top-bar-inner">
        
        {/* LEFT: Subnav links */}
        <div className="top-bar-subnav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`top-bar-subnav-button ${
                activeTab === tab.key ? 'active' : ''
              }`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* RIGHT: Search + Inbox (search is to the left of inbox) */}
        <div className="top-bar-right">
          <div className="top-bar-search">
            <GlobalSearch onSelect={onSearchSelect} />
          </div>
          <div className="top-bar-inbox">
            <FiInbox size={22} />
            {inboxCount > 0 && <span className="inbox-count">{inboxCount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;