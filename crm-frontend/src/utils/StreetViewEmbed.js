import React from 'react';

const StreetViewEmbed = ({ address }) => {
  if (!address) return null;

  const encodedAddress = encodeURIComponent(address);
  const apiKey = "AIzaSyBcto-PlwyCd1parIt-yQQzrYdEep3pnHo"; // dev only

  // Add maptype=satellite to force satellite view
  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&maptype=satellite`;

  return (
    <iframe
      title="Property Location"
      width="98%"
      height="290"
      style={{ border: 0, borderRadius: '8px' }}
      loading="lazy"
      allowFullScreen
      src={src}
    />
  );
};

export default StreetViewEmbed;