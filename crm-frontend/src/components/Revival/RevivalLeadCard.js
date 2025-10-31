import React, { useState } from 'react';
import CustomerPopup from '../Profile/CustomerPopup';

const RevivalLeadCard = ({ quote, onSave }) => {
  const [showPopup, setShowPopup] = useState(false);

  const handleClick = () => {
    setShowPopup(true);
  };

  return (
    <>
      <div className="revival-card" onClick={handleClick}>
        <h4>{quote.customer_name || 'Unnamed Lead'}</h4>
        <p>{quote.address || 'No address provided'}</p>
        <p>
          {quote.estimated_total
            ? `$${Number(quote.estimated_total).toLocaleString()}`
            : 'No estimate'}
        </p>
      </div>

      {showPopup && (
        <CustomerPopup
          lead={quote}
          leadType="revival"
          onClose={() => {
            setShowPopup(false);
            if (onSave) onSave(); // refresh parent data if needed
          }}
        />
      )}
    </>
  );
};

export default RevivalLeadCard;