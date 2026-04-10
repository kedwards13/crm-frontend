import React from 'react';

const StreetViewEmbed = ({ address }) => {
  const query = String(address || '').trim();
  if (!query) return null;

  const encodedAddress = encodeURIComponent(query);
  const apiKey = 'AIzaSyBcto-PlwyCd1parIt-yQQzrYdEep3pnHo'; // dev only
  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&maptype=satellite`;

  return (
    <div className="street-view-embed">
      <iframe
        title="Property Location"
        loading="lazy"
        allowFullScreen
        src={src}
      />
    </div>
  );
};

export default StreetViewEmbed;
