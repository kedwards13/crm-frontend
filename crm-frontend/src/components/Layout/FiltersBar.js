import React from 'react';
import './FiltersBar.css';

/**
 * Sticky filters row positioned under the TopBar.
 * Reuse on Leads, Customers, Activities, etc.
 *
 * Props:
 * - left   : ReactNode (e.g., checkbox/bulk, tag filter)
 * - center : ReactNode (e.g., search input + service dropdown + date range)
 * - right  : ReactNode (e.g., sort dropdown + primary action)
 */
export default function FiltersBar({ left, center, right }) {
  return (
    <div className="filters-bar">
      <div className="filters-inner">
        <div className="filters-left">{left}</div>
        <div className="filters-center">{center}</div>
        <div className="filters-right">{right}</div>
      </div>
    </div>
  );
}