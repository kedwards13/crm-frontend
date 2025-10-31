// src/components/Profile/ProfileTabs/InfoSection.jsx
import React from 'react';

function InfoSection({ left, right }) {
  return (
    <div className="info-section">
      <div className="info-left">
        {left}
      </div>
      <div className="info-right">
        {right}
      </div>
    </div>
  );
}

export default InfoSection;