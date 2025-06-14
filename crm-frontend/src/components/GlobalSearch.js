import React, { useState, useEffect, useRef } from 'react';
import './GlobalSearch.css';

const dummyItems = [
  { label: 'John Doe (Customer)', path: '/customers/123' },
  { label: 'ACME Corp (Lead)', path: '/leads/456' },
  { label: 'Invoice #1023', path: '/invoices/1023' },
];

const GlobalSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debounceTimeout = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      if (value.trim()) {
        const filtered = dummyItems.filter((item) =>
          item.label.toLowerCase().includes(value.toLowerCase())
        );
        setResults(filtered);
      } else {
        setResults([]);
      }
    }, 300); // Adjust delay (in ms) as needed
  };

  const handleSelect = (item) => {
    setQuery('');
    setResults([]);
    if (onSelect) onSelect(item);
  };

  return (
    <div className="global-search-container" role="search">
      <div className="search-icon" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            fill="#ccc"
            d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"
          />
        </svg>
      </div>
  
      <input
        type="text"
        className="global-search-input"
        placeholder="Search for customers, deals, tasks..."
        value={query}
        onChange={handleChange}
        aria-label="Global search"
      />
  
      {results.length > 0 && (
        <ul className="global-search-results" role="listbox">
          {results.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(item)}
              role="option"
              tabIndex="0"
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GlobalSearch;