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
      className="dark-mode-toggle-btn"
    >
      {isLightMode ? 'Dark Mode' : 'Light Mode'}
    </button>
  );
};

export default DarkModeToggle;