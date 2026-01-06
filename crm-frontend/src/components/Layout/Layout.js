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

  /* ---------------------------------------------
     THEME SYSTEM (LIGHT MODE ONLY)
  --------------------------------------------- */
  useEffect(() => {
    document.body.classList.add("light-mode");
    document.body.classList.remove("dark-mode");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    document.body.dataset.theme = "light";
    document.documentElement.dataset.theme = "light";
  }, []);

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

  /* ---------------------------------------------
     FINAL DOM STRUCTURE
     ⭐ REQUIRED: modal-root BELOW body, ABOVE app
  --------------------------------------------- */
  return (
    <>
      <div className={`layout-shell ${collapsed ? "collapsed" : ""}`}>
        <Navigation collapsed={collapsed} onToggle={toggleSidebar} />

        <TopBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          inboxCount={3}
          onSearchSelect={(item) => item?.path && navigate(item.path)}
        />

        <main className="content-area" data-shell={JSON.stringify(shellContext)}>
          {children}
        </main>
      </div>
      
    </>
  );
}
