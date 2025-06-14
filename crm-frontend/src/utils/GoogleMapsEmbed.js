import React from 'react';

const GoogleMapsEmbed = ({ address }) => {
  const encodedAddress = encodeURIComponent(address);
  const googleMapsApiKey = "AIzaSyBcto-PlwyCd1parIt-yQQzrYdEep3pnHo";  // Use your API key

  return (
    <div className="google-map-container">
      <iframe
        title={`Google Maps location for ${address}`}  // Accessibility title
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}&maptype=satellite&zoom=18`}
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default GoogleMapsEmbed;