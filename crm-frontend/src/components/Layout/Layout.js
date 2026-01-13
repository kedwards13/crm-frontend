// src/components/Layout/Layout.js
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Navigation from "./Navigation";
import TopBar from "./TopBar";

import { getSubNavForPage } from "../../constants/uiRegistry";
import { getIndustry, getUserRole } from "../../helpers/tenantHelpers";

import "./Layout.css";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  /* ---------------------------------------------
     THEME SYSTEM (LIGHT + DARK)
  --------------------------------------------- */
  useEffect(() => {
    const isDark = theme === "dark";
    const body = document.body;

    body.classList.toggle("dark-mode", isDark);
    body.classList.toggle("light-mode", !isDark);
    body.classList.toggle("dark", isDark);
    body.classList.toggle("light", !isDark);

    body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

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

  const handleTabChange = (tabKey) => {
    const target = tabs.find((t) => t.key === tabKey);
    if (target && location.pathname !== target.path) {
      setActiveTab(tabKey);
      navigate(target.path);
    }
  };

  const toggleSidebar = () => setCollapsed((v) => !v);

  const shellContext = useMemo(
    () => ({ collapsed }),
    [collapsed]
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
      <div className={`layout-shell ${collapsed ? "collapsed" : ""}`}>
        <Navigation collapsed={collapsed} onToggle={toggleSidebar} />

        <TopBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          inboxCount={3}
          theme={theme}
          onToggleTheme={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
          onSearchSelect={(item) => item?.path && navigate(item.path)}
        />

        <main className="content-area" data-shell={JSON.stringify(shellContext)}>
          {children}
        </main>
      </div>
      
    </>
  );
}
