// TableDisplay.js
import React from 'react';

function TableDisplay({ properties }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Address</th>
          <th>Type</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {properties.map((prop, index) => (
          <tr key={index}>
            <td>{prop.address}</td>
            <td>{prop.property_type}</td>
            <td>${prop.asking_price?.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TableDisplay;