// src/utils/GoogleMapsEmbed.js

import React from 'react';

function GoogleMapsEmbed({ address }) {
  const apiKey = "AIzaSyAMdWLsloKfaSKn2V_qNJMZy-p-dYSAf40";

  // Generate Google Maps Embed URL
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
    address
  )}`;

  return (
    <div className="google-map-container">
      <iframe
        title="Google Maps"
        width="100%"
        height="250"
        frameBorder="0"
        style={{ border: 0 }}
        src={mapUrl}
        allowFullScreen
      />
    </div>
  );
}

export default GoogleMapsEmbed;