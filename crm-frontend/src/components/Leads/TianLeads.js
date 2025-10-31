// src/components/Leads/TianLeads.js
import React from 'react';
import './TianLeads.css';

/**
 * Props
 * - leads: array of lead objects
 * - onLeadClick(lead)
 * - onSaveToCrm(lead)
 * - mode: 'website' | 'crm'
 * - bare: when true, render only cards (no internal grid wrapper)
 */
export default function TianLeads({
  leads = [],
  onLeadClick,
  onSaveToCrm,
  mode = 'website',
  bare = false,
}) {
  const Cards = (
    <>
      {leads.map((lead) => (
        <div
          key={lead.id ?? lead.lead_id ?? Math.random()}
          className="card lead-card"
          onClick={() => onLeadClick?.(lead)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' ? onLeadClick?.(lead) : null)}
        >
          <h3>{lead.name || 'Unnamed Lead'}</h3>

          {mode === 'website' && (
            <>
              {lead.phone_number && (
                <p>
                  <strong>Phone:</strong> {lead.phone_number}
                </p>
              )}
              {lead.email && (
                <p>
                  <strong>Email:</strong> {lead.email}
                </p>
              )}
              {lead.service && (
                <p>
                  <strong>Service:</strong> {lead.service}
                </p>
              )}
              {lead.message && (
                <p className="truncate">
                  <strong>Msg:</strong> {lead.message}
                </p>
              )}
              {lead.created_at && (
                <p>
                  <strong>Received:</strong>{' '}
                  {new Date(lead.created_at).toLocaleString()}
                </p>
              )}
            </>
          )}

          {mode === 'crm' && (
            <>
              {lead.status && (
                <p>
                  <strong>Status:</strong> {lead.status}
                </p>
              )}
              {lead.priority_score != null && (
                <p>
                  <strong>Priority:</strong> {lead.priority_score}
                </p>
              )}
            </>
          )}

          <div className="lead-actions">
            {mode === 'website' && (
              <button
                className="btn btn-save"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveToCrm?.(lead);
                }}
              >
                Save to CRM
              </button>
            )}
            <button
              className="btn btn-ai"
              onClick={(e) => {
                e.stopPropagation();
                console.log('AI Assist clicked', lead);
              }}
            >
              AI Assist
            </button>
          </div>
        </div>
      ))}
    </>
  );

  if (bare) return Cards;

  return <div className="lead-grid">{Cards}</div>;
}