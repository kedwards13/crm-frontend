// src/components/PropertyList.js
import React, { useEffect, useState } from 'react';
import api from '../../apiClient';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/properties/')
      .then(response => {
        setProperties(response.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching properties');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Properties</h1>
      <ul>
        {properties.map(property => (
          <li key={property.id}>
            <h3>{property.address}</h3>
            <p>Type: {property.property_type}</p>
            <p>Asking Price: ${property.asking_price}</p>
            <p>Rooms: {property.rooms}</p>
            <p>Bathrooms: {property.bathrooms}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PropertyList;
