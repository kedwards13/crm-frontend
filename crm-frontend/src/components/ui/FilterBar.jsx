import React from 'react';
import './glass-system.css';

export default function FilterBar({ left, center, right, className = '' }) {
  return (
    <div className={`filters-bar ui-filter-bar ${className}`.trim()}>
      <div className='filters-inner ui-filter-inner'>
        <div className='filters-left ui-filter-left'>{left}</div>
        <div className='filters-center ui-filter-center'>{center}</div>
        <div className='filters-right ui-filter-right'>{right}</div>
      </div>
    </div>
  );
}
