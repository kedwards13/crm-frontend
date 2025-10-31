import React, { useEffect, useMemo, useRef } from 'react';
import GlobalSearch from '../GlobalSearch';
import { FiInbox, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './TopBar.css';

/**
 * Fixed top bar that:
 * - visually spans across the app while content aligns after the sidebar
 * - shows a horizontally scrollable pill subnav with edge fades + arrows
 * - keeps search and inbox on the right
 */
export default function TopBar({
  onSearchSelect,
  inboxCount = 0,
  tabs = [],
  activeTab,
  onTabChange,
}) {
  const scrollerRef = useRef(null);
  const leftBtnRef  = useRef(null);
  const rightBtnRef = useRef(null);

  // show/hide scroll arrows based on overflow/scroll position
  const refreshOverflow = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const canScrollLeft  = el.scrollLeft > 2;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;

    leftBtnRef.current?.classList.toggle('hidden', !canScrollLeft);
    rightBtnRef.current?.classList.toggle('hidden', !canScrollRight);

    // edge fades
    el.classList.toggle('at-start', !canScrollLeft);
    el.classList.toggle('at-end',   !canScrollRight);
  };

  useEffect(() => {
    refreshOverflow();
    const el = scrollerRef.current;
    if (!el) return;
    const onResize = () => refreshOverflow();
    const onScroll = () => refreshOverflow();
    window.addEventListener('resize', onResize);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      el.removeEventListener('scroll', onScroll);
    };
  }, [tabs, activeTab]);

  const handleArrow = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(160, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: dir === 'left' ? -delta : delta, behavior: 'smooth' });
  };

  // Keyboard: left/right to change tab, Home/End to jump
  const onTabsKeyDown = (e) => {
    if (!tabs?.length) return;
    const idx = tabs.findIndex(t => t.key === activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = tabs[(idx + 1) % tabs.length];
      onTabChange?.(next.key);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      onTabChange?.(prev.key);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onTabChange?.(tabs[0].key);
    } else if (e.key === 'End') {
      e.preventDefault();
      onTabChange?.(tabs[tabs.length - 1].key);
    }
  };

  // Smooth wheel horizontal scroll on trackpads/mice
  const onWheel = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    // if vertical scroll dominates, let the page scroll
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  const hasTabs = useMemo(() => (tabs && tabs.length > 0), [tabs]);

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar-inner">
        {/* LEFT: Subnav */}
        <div className={`top-bar-subnav-wrap ${hasTabs ? '' : 'no-tabs'}`}>
          {hasTabs && (
            <>
              <button
                ref={leftBtnRef}
                type="button"
                className="tabs-arrow left hidden"
                aria-label="Scroll tabs left"
                onClick={() => handleArrow('left')}
              >
                <FiChevronLeft size={18} />
              </button>

              <nav
                className="top-bar-subnav-scroller at-start"
                ref={scrollerRef}
                aria-label="Page sections"
                onWheel={onWheel}
                onKeyDown={onTabsKeyDown}
                tabIndex={0}
              >
                <div className="top-bar-subnav" role="tablist" aria-orientation="horizontal">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.key}
                      className={`top-bar-subnav-button ${activeTab === tab.key ? 'active' : ''}`}
                      onClick={() => onTabChange?.(tab.key)}
                      title={tab.label}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </nav>

              <button
                ref={rightBtnRef}
                type="button"
                className="tabs-arrow right hidden"
                aria-label="Scroll tabs right"
                onClick={() => handleArrow('right')}
              >
                <FiChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* RIGHT: Search then inbox */}
        <div className="top-bar-right">
          <div className="top-bar-search">
            <GlobalSearch onSelect={onSearchSelect} />
          </div>
          <button className="top-bar-inbox" type="button" aria-label="Inbox">
            <FiInbox size={20} />
            {inboxCount > 0 && <span className="inbox-count">{inboxCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}