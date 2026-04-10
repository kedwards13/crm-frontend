// src/components/Layout/Layout.js
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiMenu, FiX } from 'react-icons/fi';

import Navigation from "./Navigation";
import TopBar from "./TopBar";
import RightInsightsPanel from "./RightInsightsPanel";
import TopBarAssistant from "../Assistant/TopBarAssistant";

import { getSubNavForPage } from "../../constants/uiRegistry";
import { getIndustry, getUserRole } from "../../helpers/tenantHelpers";
import { useTheme } from "../../theme/ThemeProvider";

import "./Layout.css";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const { mode, accent, setAccent, toggleMode, presets } = useTheme();

  /* ---------------------------------------------
     SUBNAV CONTROL
  --------------------------------------------- */
  useEffect(() => {
    const seg = location.pathname.split("/").filter(Boolean)[0] || "";
    const basePath = `/${seg}`;
    const fullPath = location.pathname;

    const recomputeTabs = () => {
      const industryKey = getIndustry("general");
      const userRole = getUserRole("Member");

      const availableTabs = getSubNavForPage(basePath, industryKey, userRole) || [];
      setTabs(availableTabs);

      const matchedTab =
        availableTabs.find(
          (t) => fullPath === t.path || fullPath.startsWith(`${t.path}/`)
        ) || null;

      if (!matchedTab && availableTabs.length > 0 && fullPath === basePath) {
        navigate(availableTabs[0].path, { replace: true });
        setActiveTab(availableTabs[0].key);
      } else {
        setActiveTab(matchedTab?.key || null);
      }
    };

    recomputeTabs();

    const onStorage = (e) => {
      if (e.key === "activeTenant" || e.key === "ui_overrides") {
        recomputeTabs();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [location, navigate]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    const target = tabs.find((t) => t.key === tabKey);
    if (target && location.pathname !== target.path) {
      setActiveTab(tabKey);
      navigate(target.path);
    }
  };

  const handleGlobalSearch = ({ query, path, result }) => {
    const route = result?.route || {};
    if (path) {
      navigate(path);
      return;
    }
    if (route.web_path) {
      navigate(route.web_path);
      return;
    }
    if (result?.result_type === "customer" && route.customer_id) {
      navigate(`/customers/list?search=${encodeURIComponent(String(route.customer_id))}`);
      return;
    }
    if (result?.result_type === "lead" && route.lead_id) {
      navigate(`/leads/${route.lead_id}`);
      return;
    }
    if (result?.result_type === "quote" && route.quote_id) {
      navigate(`/quotes/${encodeURIComponent(String(route.quote_id))}`);
      return;
    }
    if (query) {
      navigate('/customers/list', { state: { search: query } });
    }
  };

  const toggleSidebar = () => setCollapsed((v) => !v);

  const showInsightsPanel = useMemo(
    () =>
      !location.pathname.startsWith("/communication") &&
      !location.pathname.startsWith("/communications"),
    [location.pathname]
  );
  const shellContext = useMemo(
    () => ({ collapsed, withInsights: showInsightsPanel }),
    [collapsed, showInsightsPanel]
  );

  const hasTabsData = Array.isArray(tabs);

  /* ---------------------------------------------
     FINAL DOM STRUCTURE
     ⭐ REQUIRED: modal-root BELOW body, ABOVE app
  --------------------------------------------- */
  if (!hasTabsData) {
    return (
      <main className="content-area">
        <div className="card">
          <h3>Loading workspace…</h3>
          <p>We’re initializing your tenant. If this persists, refresh or head to dashboard.</p>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div
        className={`layout-shell ${collapsed ? "collapsed" : ""} ${showInsightsPanel ? "with-insights" : ""}`}
        data-theme={mode}
      >
        <button
          type="button"
          className={`mobile-nav-trigger ${mobileNavOpen ? 'is-open' : ''}`}
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <FiX size={18} /> : <FiMenu size={18} />}
        </button>

        <Navigation
          collapsed={collapsed}
          onToggle={toggleSidebar}
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />

        <TopBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          inboxCount={3}
          theme={mode}
          accent={accent}
          presets={presets}
          onSetAccent={setAccent}
          onToggleTheme={toggleMode}
          assistantOpen={assistantOpen}
          onToggleAssistant={() => setAssistantOpen((current) => !current)}
          onSearchSelect={handleGlobalSearch}
        />

        <main
          className="content-area"
          data-shell={JSON.stringify(shellContext)}
        >
          {children}
        </main>

        {showInsightsPanel ? (
          <aside
            className={`layout-insights dispatch-live-panel ${insightsOpen ? "is-open" : "is-collapsed"}`}
            aria-label="Global intelligence panel"
          >
            <button
              type="button"
              className="layout-insights-toggle"
              onClick={() => setInsightsOpen((current) => !current)}
              aria-expanded={insightsOpen}
              aria-label={insightsOpen ? "Collapse live control panel" : "Expand live control panel"}
            >
              {insightsOpen ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
            </button>

            {insightsOpen ? (
              <div className="layout-insights-body">
                <RightInsightsPanel />
              </div>
            ) : (
              <div className="layout-insights-rail" aria-hidden="true">
                <span className="layout-insights-rail-copy">Live</span>
              </div>
            )}
          </aside>
        ) : null}
      </div>
      <TopBarAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
