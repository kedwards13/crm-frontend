import React from 'react';
import StreetViewEmbed from '../../../utils/StreetViewEmbed';

function InfoTab({ lead, onChange }) {
  if (!lead) return <div>Loading lead info...</div>;

  return (
    <>
      <h4 className="section-header">Basic Information</h4>
      <div className="customer-info">
        <div className="left">
          <label>Name</label>
          <input name="name" value={lead.name || ''} onChange={onChange} />
          <label>Phone</label>
          <input name="phone_number" value={lead.phone_number || ''} onChange={onChange} />
          <label>Email</label>
          <input name="email" value={lead.email || ''} onChange={onChange} />
          <label>Address</label>
          <input name="address" value={lead.address || ''} onChange={onChange} />
        </div>
        <div className="right">
          <StreetViewEmbed address={lead.address || ''} />
        </div>
      </div>

      <h4 className="section-header">Property Details</h4>
      <div className="property-details">
        <label>Property Type</label>
        <input name="property_type" value={lead.property_type || ''} onChange={onChange} />
        <label>Beds</label>
        <input type="number" name="beds" value={lead.beds || ''} onChange={onChange} />
        <label>Baths</label>
        <input type="number" name="bathrooms" value={lead.bathrooms || ''} onChange={onChange} />
        <label>Condition</label>
        <input name="condition" value={lead.condition || ''} onChange={onChange} />
        <label>Sell Timeline</label>
        <input name="sell_timeline" value={lead.sell_timeline || ''} onChange={onChange} />
        <label>Asking Price</label>
        <input type="number" name="asking_price" value={lead.asking_price || ''} onChange={onChange} />
      </div>
    </>
  );
}

export default InfoTab;