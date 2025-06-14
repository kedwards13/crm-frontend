// Example DarkModeToggle.js
import React, { useEffect, useState } from 'react';

const DarkModeToggle = () => {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isLightMode]);

  return (
    <button
      onClick={() => setIsLightMode(!isLightMode)}
      style={{
        backgroundColor: '#0a84ff',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '0.5rem 1rem',
        cursor: 'pointer'
      }}
    >
      {isLightMode ? 'Dark Mode' : 'Light Mode'}
    </button>
  );
};

export default DarkModeToggle;