import React from 'react';
import { FiSearch } from 'react-icons/fi';
import './glass-system.css';

export default function SearchInput({ className = '', inputClassName = '', ...props }) {
  return (
    <label className={`ui-search-input ${className}`.trim()}>
      <FiSearch size={14} />
      <input className={inputClassName} {...props} />
    </label>
  );
}
