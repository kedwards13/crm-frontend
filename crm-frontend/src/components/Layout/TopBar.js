// src/components/Layout/TopBar.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

import "./TopBar.css";

export default function TopBar({
  onSearchSelect,
  inboxCount = 0,
  tabs = [],
  activeTab,
  onTabChange,
  theme = "system",
  onThemeChange,
}) {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const leftBtnRef = useRef(null);
  const rightBtnRef = useRef(null);

  const [showNewMenu, setShowNewMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /* --------------------------------------------------------------------------
     🌟 Overflow Handling for Scrolling Pills
  -------------------------------------------------------------------------- */
  const refreshOverflow = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 2;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;

    leftBtnRef.current?.classList.toggle("hidden", !canLeft);
    rightBtnRef.current?.classList.toggle("hidden", !canRight);
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

  const scrollTabs = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });
  };

  const handleThemeToggle = () =>
    onThemeChange(theme === "dark" ? "light" : "dark");

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
                className="tabs-arrow left hidden"
                onClick={() => scrollTabs("left")}
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
                      onClick={() => onTabChange(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </nav>

              <button
                ref={rightBtnRef}
                className="tabs-arrow right hidden"
                onClick={() => scrollTabs("right")}
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
              placeholder="Search for customers, deals, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {/* Inbox */}
          <div className="inbox-wrapper">
            <button
              className="top-bar-btn"
              onClick={() => navigate("/inbox")}
              aria-label="Inbox"
            >
              <FiInbox size={20} />
            </button>
            {inboxCount > 0 && (
              <span className="inbox-count">{inboxCount}</span>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className="top-bar-btn"
            onClick={handleThemeToggle}
            aria-label="Theme Toggle"
          >
            {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {/* + NEW BUTTON */}
          <div className="top-bar-new-container">
            <button
              className="top-bar-new-btn"
              onClick={() => setShowNewMenu((v) => !v)}
            >
              <FiPlus size={18} />
              <span>New</span>
            </button>

            {showNewMenu && (
              <div className="top-bar-new-menu">
                <button onClick={() => handleNewAction("/customers/new")}>
                  Add Customer
                </button>
                <button onClick={() => handleNewAction("/leads/new")}>
                  Add Lead
                </button>
                <button onClick={() => handleNewAction("/revival/scan")}>
                  Scan Quote
                </button>
                <button onClick={() => handleNewAction("/tasks/new")}>
                  New Task
                </button>
                <button onClick={() => handleNewAction("/schedule/new")}>
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
