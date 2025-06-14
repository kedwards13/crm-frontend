// src/components/Welcome.js
import React from 'react';
import './Welcome.css';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <h1>Welcome to Our CRM</h1>
      <p>Manage your real estate leads, deals, and more in one place.</p>
      <div className="welcome-buttons">
        <a href="/login" className="welcome-button">Login</a>
        <a href="/signup" className="welcome-button">Sign Up</a>
      </div>
    </div>
  );
};

export default Welcome;