// src/components/Layout/TopBar.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiSearch,
  FiMoon,
  FiSun,
  FiDroplet,
  FiZap,
} from "react-icons/fi";
import { getIndustry } from "../../helpers/tenantHelpers";
import { getIndustryCopy } from "../../constants/industryCopy";
import { globalSearch } from "../../api/searchApi";
import { normalizeSmartQuery } from "../../utils/smartQuery";

import "./TopBar.css";

export default function TopBar({
  onSearchSelect,
  inboxCount = 0,
  tabs = [],
  activeTab,
  onTabChange,
  theme = "light",
  accent = "emerald",
  presets = [],
  onSetAccent,
  onToggleTheme,
  assistantOpen = false,
  onToggleAssistant,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollerRef = useRef(null);
  const leftBtnRef = useRef(null);
  const rightBtnRef = useRef(null);
  const themeMenuRef = useRef(null);

  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tabOverflow, setTabOverflow] = useState({ left: false, right: false });
  const industry = getIndustry("general");
  const copy = getIndustryCopy(industry);
  const hideGlobalSearch = location.pathname.startsWith("/leads");

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
    if (!hideGlobalSearch && count !== 1) {
      console.error("🚨 INVALID STATE: Expected 1 top-bar-search, found", count);
    }
  }, [hideGlobalSearch]);

  useEffect(() => {
    if (!showThemeMenu) return undefined;
    const onClickAway = (event) => {
      if (!themeMenuRef.current?.contains(event.target)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [showThemeMenu]);

  useEffect(() => {
    let cancelled = false;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return undefined;
    }
    const timeout = setTimeout(async () => {
      try {
        const { data } = await globalSearch(q);
        if (!cancelled) {
          const rows = Array.isArray(data?.results) ? data.results : [];
          setSearchResults(rows.slice(0, 8));
          setSearchOpen(rows.length > 0);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchOpen(false);
        }
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

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
    const q = normalizeSmartQuery(searchQuery);
    if (!q) return;
    onSearchSelect?.({ query: q });
    setSearchOpen(false);
  };

  const handleThemeToggle = () => {
    onToggleTheme?.();
  };

  const applyAccent = (nextAccent) => {
    onSetAccent?.(nextAccent);
    setShowThemeMenu(false);
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
          {!hideGlobalSearch && (
            <div className="top-bar-search">
              <FiSearch
                size={16}
                className="top-bar-search-icon"
                onClick={triggerSearch}
              />
              <input
                type="text"
                placeholder={`${copy.searchPlaceholder || "Search CRM records"} or ask a smart query`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setSearchOpen(searchResults.length > 0)}
              />
              {searchOpen && searchResults.length > 0 ? (
                <div className="top-bar-search-results">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.result_type}-${result.id}`}
                      type="button"
                      className="top-bar-search-result"
                      onClick={() => {
                        onSearchSelect?.({ result, query: normalizeSmartQuery(searchQuery) });
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <strong>{result.label}</strong>
                      <span>{result.subtitle || result.result_type}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Theme toggle */}
          <div className="top-bar-theme-wrap" ref={themeMenuRef}>
            <button
              className="top-bar-btn theme-toggle icon-pill"
              onClick={() => setShowThemeMenu((v) => !v)}
              aria-label="Theme and accent"
              type="button"
            >
              <FiDroplet size={17} />
            </button>
            {showThemeMenu ? (
              <div className="top-bar-theme-menu">
                <button type="button" onClick={handleThemeToggle} className="theme-mode-btn">
                  {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
                  <span>{theme === "dark" ? "Switch to Light" : "Switch to Dark"}</span>
                </button>
                <div className="theme-swatches">
                  {presets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      aria-label={`Use ${preset.label} accent`}
                      title={preset.label}
                      onClick={() => applyAccent(preset.key)}
                      className={`theme-swatch ${accent === preset.key ? "active" : ""}`}
                      style={{
                        '--swatch-primary': preset.primary,
                        '--swatch-secondary': preset.secondary,
                      }}
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button
            className={`top-bar-btn icon-pill ${assistantOpen ? "active" : ""}`}
            onClick={() => onToggleAssistant?.()}
            aria-label={assistantOpen ? "Close assistant" : "Open assistant"}
            type="button"
          >
            <FiZap size={17} />
          </button>

          {/* Inbox */}
          <div className="inbox-wrapper">
            <button
              className="top-bar-btn icon-pill"
              onClick={() => navigate("/communication/inbox")}
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
