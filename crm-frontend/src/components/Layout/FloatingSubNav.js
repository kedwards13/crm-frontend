import React, { useEffect, useRef } from 'react';
import './FloatingSubNav.css';

/**
 * FloatingSubNav
 * Fixed, full-width subnav row that docks under the TopBar and aligns with the sidebar.
 *
 * Props:
 *  - tabs:      [{ key, label }]
 *  - activeTab: string
 *  - onTabChange(key)
 *  - leftSlot / rightSlot: optional React nodes (bulk actions, view toggles, etc.)
 */
export default function FloatingSubNav({
  tabs = [],
  activeTab,
  onTabChange,
  leftSlot = null,
  rightSlot = null,
}) {
  const scrollerRef = useRef(null);
  const leftBtnRef  = useRef(null);
  const rightBtnRef = useRef(null);

  const refresh = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const canLeft  = el.scrollLeft > 2;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;

    leftBtnRef.current?.classList.toggle('hidden', !canLeft);
    rightBtnRef.current?.classList.toggle('hidden', !canRight);
    el.classList.toggle('at-start', !canLeft);
    el.classList.toggle('at-end',   !canRight);
  };

  useEffect(() => {
    refresh();
    const el = scrollerRef.current;
    if (!el) return;
    const onResize = () => refresh();
    const onScroll = () => refresh();
    window.addEventListener('resize', onResize);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      el.removeEventListener('scroll', onScroll);
    };
  }, [tabs, activeTab]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(160, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: dir === 'left' ? -delta : delta, behavior: 'smooth' });
  };

  if (!tabs.length && !leftSlot && !rightSlot) return null;

  return (
    <div className="floating-subnav" role="navigation" aria-label="Page sections">
      <div className="floating-subnav-inner">
        {leftSlot && <div className="fsn-left">{leftSlot}</div>}

        {tabs.length > 0 && (
          <div className="fsn-tabs-wrap">
            <button
              ref={leftBtnRef}
              type="button"
              className="fsn-arrow left hidden"
              aria-label="Scroll tabs left"
              onClick={() => scrollByDir('left')}
            >
              ‹
            </button>

            <div className="fsn-scroller at-start" ref={scrollerRef}>
              <div className="fsn-tabs" role="tablist" aria-orientation="horizontal">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.key}
                    className={`fsn-tab ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => onTabChange?.(t.key)}
                    title={t.label}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              ref={rightBtnRef}
              type="button"
              className="fsn-arrow right hidden"
              aria-label="Scroll tabs right"
              onClick={() => scrollByDir('right')}
            >
              ›
            </button>
          </div>
        )}

        {rightSlot && <div className="fsn-right">{rightSlot}</div>}
      </div>
    </div>
  );
}