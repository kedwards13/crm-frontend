// ✅ Enrichment.jsx
import React, { useEffect, useState } from 'react';
import { fetchEnrichedLead } from '../../../services/enrich';

function Enrichment({ lead }) {
  const [enriched, setEnriched] = useState(null);

  useEffect(() => {
    if (!lead.name || !lead.phone_number) return;

    const [first_name, ...rest] = lead.name.split(' ');
    const last_name = rest.join(' ') || '';

    fetchEnrichedLead(first_name, last_name, lead.address, lead.phone_number)
      .then(setEnriched)
      .catch(console.error);
  }, [lead]);

  if (!enriched) {
    return <div className="enrich-card">Enriching data...</div>;
  }

  const { ai_attributes = {}, enrichment_data = {}, ai_confidence_score } = enriched;

  return (
    <div className="enrich-card">
      <div className="enrich-header">
        <h5 className="font-medium text-gray-800 mb-2">Enriched Insights</h5>
        {ai_confidence_score && (
          <div className="text-sm text-gray-500">Confidence: {Math.round(ai_confidence_score * 100)}%</div>
        )}
      </div>

      <div className="enrich-fields space-y-1 text-sm text-gray-700">
        {ai_attributes?.email_found?.length > 0 && (
          <div>
            <strong>Emails:</strong> {ai_attributes.email_found.join(', ')}
          </div>
        )}
        {ai_attributes?.phone_numbers?.length > 0 && (
          <div>
            <strong>Phones:</strong> {ai_attributes.phone_numbers.join(', ')}
          </div>
        )}
        {ai_attributes?.linkedin && (
          <div>
            <strong>LinkedIn:</strong>{' '}
            <a href={ai_attributes.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {ai_attributes.linkedin}
            </a>
          </div>
        )}
        {ai_attributes?.facebook && (
          <div>
            <strong>Facebook:</strong>{' '}
            <a href={ai_attributes.facebook} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {ai_attributes.facebook}
            </a>
          </div>
        )}
        {enrichment_data?.job_title && (
          <div>
            <strong>Job:</strong> {enrichment_data.job_title}
          </div>
        )}
        {enrichment_data?.company && (
          <div>
            <strong>Company:</strong> {enrichment_data.company}
          </div>
        )}
      </div>
    </div>
  );
}

export default Enrichment;