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

  const handleGlobalSearch = ({ query, path }) => {
    if (path) {
      navigate(path);
      return;
    }
    if (query) {
      navigate('/customers/list', { state: { search: query } });
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
      <div
        className={`layout-shell ${collapsed ? "collapsed" : ""} text-[var(--text-1)]`}
        data-theme={theme}
      >
        {/* Anthracite mesh background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
          style={{
            background: 'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.14), transparent 25%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.12), transparent 28%), radial-gradient(circle at 40% 78%, rgba(244,63,94,0.12), transparent 30%), var(--bg)',
            filter: 'saturate(1.05)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          aria-hidden
          style={{
            backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.0) 32%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.0) 100%)',
          }}
        />

        <Navigation collapsed={collapsed} onToggle={toggleSidebar} />

        <TopBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          inboxCount={3}
          theme={theme}
          onToggleTheme={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
          onSearchSelect={handleGlobalSearch}
        />

        <main
          className="content-area"
          data-shell={JSON.stringify(shellContext)}
          style={{
            background: theme === 'dark'
              ? 'radial-gradient(140% 90% at 50% 20%, rgba(255,255,255,0.02), transparent 55%), radial-gradient(120% 60% at 20% 80%, rgba(99,102,241,0.08), transparent 50%)'
              : 'radial-gradient(120% 70% at 60% 10%, rgba(99,102,241,0.08), transparent 50%)',
          }}
        >
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5 dark:border-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] blur-[80px]" aria-hidden />
            <div className="relative rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[20px] shadow-[0_30px_80px_rgba(0,0,0,0.35)] p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
      
    </>
  );
}
