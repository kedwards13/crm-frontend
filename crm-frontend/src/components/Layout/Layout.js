// src/components/Layout/Layout.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import TopBar from './TopBar'; // We'll move subnav into here
import { getSubNavForPage } from '../../constants/subnavRegistry';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 1. Derive basePath (/customers, /leads, etc.) from the URL
    const basePath = `/${location.pathname.split('/')[1] || ''}`;
    const fullPath = location.pathname;

    // 2. Get tenant industry from localStorage (fall back to 'general')
    let tenantIndustry = 'general';
    try {
      const tenantStr = localStorage.getItem('activeTenant');
      if (tenantStr && tenantStr !== 'undefined') {
        const tenantObj = JSON.parse(tenantStr);
        tenantIndustry = tenantObj?.industry?.toLowerCase() || 'general';
      }
    } catch (err) {
      console.warn('⚠️ Failed to parse tenant industry:', err);
    }

    // 3. Look up relevant tabs for this basePath + industry
    const availableTabs = getSubNavForPage(basePath, tenantIndustry);
    setTabs(availableTabs);

    // 4. Determine which tab is "active" based on the current path
    const matchedTab = availableTabs.find(
      (tab) => fullPath === tab.path || fullPath.startsWith(tab.path)
    );

    // If there's no matched tab but we do have tabs, and user is exactly at basePath,
    // redirect them to the first tab's path
    if (!matchedTab && availableTabs.length > 0 && fullPath === basePath) {
      navigate(availableTabs[0].path, { replace: true });
      setActiveTab(availableTabs[0].key);
    } else {
      setActiveTab(matchedTab?.key || null);
    }
  }, [location, navigate]);

  // Handler when user clicks a subnav tab
  const handleTabChange = (tabKey) => {
    const selectedTab = tabs.find((tab) => tab.key === tabKey);
    if (selectedTab) {
      setActiveTab(tabKey);
      navigate(selectedTab.path);
    }
  };

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div className={`layout-container ${collapsed ? 'collapsed' : ''}`}>
      {/* Left navigation (sidebar) */}
      <Navigation onToggle={toggleSidebar} collapsed={collapsed} />

      {/* Top bar that now also receives tab props */}
      <TopBar
        onSearchSelect={(item) => navigate(item.path)} 
        inboxCount={3}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main content area */}
      <div className="layout-main">
        <div className="layout-content">{children}</div>
      </div>
    </div>
  );
};

export default Layout;