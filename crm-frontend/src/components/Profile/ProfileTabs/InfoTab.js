import React from 'react';
import StreetViewEmbed from '../../../utils/StreetViewEmbed';
import InfoSection from './InfoSection';
import Enrichment from './Enrichment.jsx';
import './styles.scss';

function InfoTab({ lead, onChange, industry }) {
  if (!lead) return <div className="loading">Loading lead info...</div>;

  const isRevival = lead.source === 'revival' || lead.quote_amount !== undefined;
  const { name, phone_number, email, address } = lead;

  const renderSharedFields = () => (
    <>
      <label>Name</label>
      <input name="name" value={name || ''} onChange={onChange} />

      <label>Phone</label>
      <input name="phone_number" value={phone_number || ''} onChange={onChange} />

      <label>Email</label>
      <input name="email" value={email || ''} onChange={onChange} />

      <label>Address</label>
      <input name="address" value={address || ''} onChange={onChange} />

      {isRevival && (
        <>
          <label>Quote Amount</label>
          <input
            type="number"
            name="quote_amount"
            value={lead.quote_amount || ''}
            onChange={onChange}
          />
          <label>Status</label>
          <input
            name="status"
            value={lead.status || ''}
            onChange={onChange}
          />
        </>
      )}
    </>
  );

  const renderIndustryFields = () => {
    switch (industry) {
      case 'real_estate':
        return (
          <>
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
          </>
        );

      case 'pest_control':
        return (
          <>
            <label>Service Type</label>
            <input name="service_type" value={lead.service_type || ''} onChange={onChange} />

            <label>Frequency</label>
            <input name="frequency" value={lead.frequency || ''} onChange={onChange} />

            <label>Last Treatment</label>
            <input name="last_treatment" value={lead.last_treatment || ''} onChange={onChange} />

            <label>Notes</label>
            <textarea name="notes" value={lead.notes || ''} onChange={onChange} />
          </>
        );

      case 'cleaning':
        return (
          <>
            <label>Cleaning Type</label>
            <input name="cleaning_type" value={lead.cleaning_type || ''} onChange={onChange} />

            <label>Frequency</label>
            <input name="frequency" value={lead.frequency || ''} onChange={onChange} />

            <label>Pets in Home</label>
            <input name="pets" value={lead.pets || ''} onChange={onChange} />

            <label>Special Instructions</label>
            <textarea name="notes" value={lead.notes || ''} onChange={onChange} />
          </>
        );

      case 'landscaping':
      case 'construction':
        return (
          <>
            <label>Project Type</label>
            <input name="project_type" value={lead.project_type || ''} onChange={onChange} />

            <label>Square Footage</label>
            <input name="square_footage" value={lead.square_footage || ''} onChange={onChange} />

            <label>Budget</label>
            <input name="budget" value={lead.budget || ''} onChange={onChange} />

            <label>Deadline</label>
            <input name="deadline" value={lead.deadline || ''} onChange={onChange} />
          </>
        );

      default:
        return <div>No industry-specific fields for this lead.</div>;
    }
  };

  return (
    <div className="info-tab">
      {/* Shared Info + Street View */}
      <h4 className="section-header">Basic Information</h4>
      <InfoSection
        left={renderSharedFields()}
        right={<StreetViewEmbed address={lead.address || ''} />}
      />

      {/* Industry-Specific Info + AI Enrichment */}
      <h4 className="section-header">Industry-Specific Details</h4>
      <InfoSection
        left={renderIndustryFields()}
        right={<Enrichment lead={lead} />}
      />
    </div>
  );
}

export default InfoTab;