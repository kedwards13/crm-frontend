// src/components/Layout/Layout.js
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { getSubNavForPage } from '../../constants/uiRegistry';
import { getIndustry, getUserRole } from '../../helpers/tenantHelpers';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate  = useNavigate();

  const [tabs, setTabs]           = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme]         = useState('system'); // 'dark' | 'light' | 'system'

  // ------- Theme (light/dark/system) -------
  useEffect(() => {
    setTheme(localStorage.getItem('theme') || 'system');
  }, []);

  useEffect(() => {
    const mm = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const prefersDark = !!mm?.matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      document.body.classList.toggle('light-mode', !isDark);
    };
    apply();
    if (theme === 'system' && mm?.addEventListener) {
      mm.addEventListener('change', apply);
      return () => mm.removeEventListener('change', apply);
    }
  }, [theme]);

  // ------- Tabs wiring (industry + route) -------
  useEffect(() => {
    // normalize "/leads/new" -> basePath "/leads"
    const seg = location.pathname.split('/').filter(Boolean)[0] || '';
    const basePath = `/${seg}`;
    const fullPath = location.pathname;

    const recompute = () => {
      // single source of truth for industry + role
      const industryKey = getIndustry('general');   // e.g. 'pest_control'
      const userRole    = getUserRole('Member');    // e.g. 'Admin' | 'Manager' | 'Member'

      // read subnav for this page from uiRegistry
      const availableTabs = getSubNavForPage(basePath, industryKey, userRole) || [];
      setTabs(availableTabs);

      // find the best matching active tab
      const matchedTab = availableTabs.find(
        (t) => fullPath === t.path || fullPath.startsWith(`${t.path}/`)
      );

      if (!matchedTab && availableTabs.length > 0 && fullPath === basePath) {
        // nudge to first tab only when sitting exactly at basePath
        navigate(availableTabs[0].path, { replace: true });
        setActiveTab(availableTabs[0].key);
      } else {
        setActiveTab(matchedTab?.key ?? null);
      }
    };

    recompute();

    // react to changes from another tab/login that update tenant/overrides
    const onStorage = (e) => {
      if (e.key === 'activeTenant' || e.key === 'ui_overrides') {
        recompute();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [location, navigate]);

  const handleTabChange = (tabKey) => {
    const selected = tabs.find((t) => t.key === tabKey);
    if (selected && location.pathname !== selected.path) {
      setActiveTab(tabKey);
      navigate(selected.path);
    }
  };

  const toggleSidebar = () => setCollapsed((v) => !v);

  // Expose shell state if children need it later
  const shellContext = useMemo(
    () => ({ collapsed, theme, setTheme }),
    [collapsed, theme]
  );

  return (
    <div className={`layout-shell ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar (fixed) */}
      <Navigation collapsed={collapsed} onToggle={toggleSidebar} />

      {/* Top bar (fixed) */}
      <TopBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        inboxCount={3}
        onSearchSelect={(item) => item?.path && navigate(item.path)}
        theme={theme}
        onThemeChange={(next) => {
          localStorage.setItem('theme', next);
          setTheme(next);
        }}
      />

      {/* Scrollable content area (the only scroller) */}
      <main className="content-area" data-shell={JSON.stringify(shellContext)}>
        {children}
      </main>
    </div>
  );
};

export default Layout;