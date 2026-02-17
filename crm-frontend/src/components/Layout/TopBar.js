// src/components/Layout/TopBar.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiSearch,
  FiMoon,
  FiSun,
} from "react-icons/fi";
import { getIndustry } from "../../helpers/tenantHelpers";
import { getIndustryCopy } from "../../constants/industryCopy";

import "./TopBar.css";

export default function TopBar({
  onSearchSelect,
  inboxCount = 0,
  tabs = [],
  activeTab,
  onTabChange,
  theme = "light",
  onToggleTheme,
}) {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const leftBtnRef = useRef(null);
  const rightBtnRef = useRef(null);
  const __topbarInstanceId = useRef(Math.random().toString(16).slice(2));

  const [showNewMenu, setShowNewMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabOverflow, setTabOverflow] = useState({ left: false, right: false });
  const industry = getIndustry("general");
  const copy = getIndustryCopy(industry);

  /* --------------------------------------------------------------------------
     🌟 Overflow Handling for Scrolling Pills
  -------------------------------------------------------------------------- */
  const refreshOverflow = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 2;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;

    setTabOverflow({ left: canLeft, right: canRight });
  };

  useEffect(() => {
    refreshOverflow();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => refreshOverflow();
    const onResize = () => refreshOverflow();

    window.addEventListener("resize", onResize);
    el.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("scroll", onScroll);
    };
  }, [tabs, activeTab]);

  useEffect(() => {
    const count = document.querySelectorAll(".top-bar-search").length;
    if (count !== 1) {
      console.error("🚨 INVALID STATE: Expected 1 top-bar-search, found", count);
    }
  }, []);

  const scrollTabs = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });
  };

  const hasTabs = useMemo(() => tabs?.length > 0, [tabs]);

  /* --------------------------------------------------------------------------
     🔍 SIMPLE INLINE SEARCH (no GlobalSearch component)
  -------------------------------------------------------------------------- */
  const triggerSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    // You can later replace this with real global search routing
    onSearchSelect?.({ query: q });
  };

  const handleThemeToggle = () => {
    onToggleTheme?.();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerSearch();
    }
  };

  /* --------------------------------------------------------------------------
     🌟 NEW MENU ACTION HANDLING
  -------------------------------------------------------------------------- */
  const handleNewAction = (path) => {
    if (path === "/customers/new") {
      navigate("/customers/list", { state: { create: "customer" } });
    } else if (path === "/leads/new") {
      navigate("/leads/new", { state: { create: "lead" } });
    } else {
      navigate(path);
    }
    setShowNewMenu(false);
  };

  /* --------------------------------------------------------------------------
     🌟 FINAL RENDER
  -------------------------------------------------------------------------- */
  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        {/* ------------------------------------------------------------------
            LEFT SECTION — FLOATING SUBNAV / TABS
        ------------------------------------------------------------------ */}
        <div className={`top-bar-subnav-wrap ${!hasTabs ? "no-tabs" : ""}`}>
          {hasTabs && (
            <>
              <button
                ref={leftBtnRef}
                className={`tabs-arrow left ${tabOverflow.left ? "" : "disabled"}`}
                type="button"
                onClick={() => scrollTabs("left")}
                disabled={!tabOverflow.left}
              >
                <FiChevronLeft size={18} />
              </button>

              <nav
                className="top-bar-subnav-scroller"
                ref={scrollerRef}
                onWheel={(e) => {
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    scrollerRef.current.scrollLeft += e.deltaY;
                    e.preventDefault();
                  }
                }}
              >
                <div className="top-bar-subnav">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      className={`top-bar-subnav-button ${
                        activeTab === t.key ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => onTabChange(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </nav>

              <button
                ref={rightBtnRef}
                className={`tabs-arrow right ${tabOverflow.right ? "" : "disabled"}`}
                type="button"
                onClick={() => scrollTabs("right")}
                disabled={!tabOverflow.right}
              >
                <FiChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* ------------------------------------------------------------------
            RIGHT SECTION — SEARCH + INBOX + THEME + NEW
        ------------------------------------------------------------------ */}
        <div className="top-bar-right">
          {/* 🔍 Clean inline search (no nested component) */}
          <div className="top-bar-search">
            <FiSearch
              size={16}
              className="top-bar-search-icon"
              onClick={triggerSearch}
            />
            <input
              type="text"
              placeholder={copy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {/* Theme toggle */}
          <button
            className="top-bar-btn theme-toggle icon-pill"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
            type="button"
          >
            {theme === "dark" ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          {/* Inbox */}
          <div className="inbox-wrapper">
            <button
              className="top-bar-btn icon-pill"
              onClick={() => navigate("/inbox")}
              aria-label="Inbox"
              type="button"
            >
              <FiInbox size={20} />
            </button>
            {inboxCount > 0 && (
              <span className="inbox-count">{inboxCount}</span>
            )}
          </div>

          {/* + NEW BUTTON */}
          <div className="top-bar-new-container">
            <button
              className="top-bar-new-btn"
              onClick={() => setShowNewMenu((v) => !v)}
              type="button"
              aria-haspopup="menu"
              aria-expanded={showNewMenu}
            >
              <FiPlus size={18} />
              <span>New</span>
            </button>

            {showNewMenu && (
              <div className="top-bar-new-menu">
                <button type="button" onClick={() => handleNewAction("/customers/new")}>
                  Add {copy.customer}
                </button>
                <button type="button" onClick={() => handleNewAction("/leads/new")}>
                  Add {copy.lead}
                </button>
                <button type="button" onClick={() => handleNewAction("/revival/scan")}>
                  Scan Quote
                </button>
                <button type="button" onClick={() => handleNewAction("/tasks/new")}>
                  New Task
                </button>
                <button type="button" onClick={() => handleNewAction("/schedule/new")}>
                  Add Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
