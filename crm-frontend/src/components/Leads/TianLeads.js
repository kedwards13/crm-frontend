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
  onArchive,
  onSpam,
  onViewInPipeline,
  mode = 'website',
  bare = false,
}) {
  const Cards = (
    <>
      {leads.map((lead) => {
        const isWebLead = mode === 'website';
        const isCrmLead = mode === 'crm';
        const leadKey = isWebLead
          ? `web-${lead.id ?? lead.created_at}`
          : lead.id ?? lead.lead_id ?? lead.universal_id ?? lead.created_at;
        const aiLabel = mode === 'website' ? 'AI Analyze' : 'AI Assist';
        return (
          <div
            key={leadKey}
            className="card lead-card"
            onClick={() => onLeadClick?.(lead)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' ? onLeadClick?.(lead) : null)}
          >
          <div className="lead-title-row">
            <h3>{lead.displayName || lead.name || 'Unnamed Lead'}</h3>
            {mode === 'website' && (
              <span className={`lead-source ${isCrmLead ? 'crm' : 'web'}`}>
                {isCrmLead ? 'CRM Lead' : 'Website Lead'}
              </span>
            )}
          </div>

          {mode === 'website' && (
            <>
              {(lead.displayPhone || lead.phone_number) && (
                <p>
                  <strong>Phone:</strong> {lead.displayPhone || lead.phone_number}
                </p>
              )}
              {(lead.displayEmail || lead.email) && (
                <p>
                  <strong>Email:</strong> {lead.displayEmail || lead.email}
                </p>
              )}
              {(lead.serviceLabel || lead.service) && (
                <p>
                  <strong>Service:</strong> {lead.serviceLabel || lead.service}
                </p>
              )}
              {!lead.serviceLabel && !lead.service && (
                <p>
                  <strong>Service:</strong> General Inquiry
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
              {(lead.safeStatus || lead.status) && (
                <p>
                  <strong>Status:</strong> {lead.safeStatus || lead.status}
                </p>
              )}
              {(lead.displayPhone || lead.phone_number) && (
                <p>
                  <strong>Phone:</strong> {lead.displayPhone || lead.phone_number}
                </p>
              )}
              {(lead.displayEmail || lead.email) && (
                <p>
                  <strong>Email:</strong> {lead.displayEmail || lead.email}
                </p>
              )}
              {(lead.serviceLabel || lead.service || lead.industry_role) && (
                <p>
                  <strong>Service:</strong> {lead.serviceLabel || lead.service || lead.industry_role}
                </p>
              )}
              {!lead.serviceLabel && !lead.service && !lead.industry_role && (
                <p>
                  <strong>Service:</strong> General Inquiry
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
            {mode === 'website' && isWebLead && (
              <button
                className="btn btn-save"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveToCrm?.(lead);
                }}
              >
                Add to Pipeline
              </button>
            )}
            {mode === 'website' && isCrmLead && onViewInPipeline && (
              <button
                className="btn btn-save"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewInPipeline?.(lead);
                }}
              >
                View in Pipeline
              </button>
            )}
            {mode === 'website' && isWebLead && onArchive && (
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(lead);
                }}
              >
                Archive
              </button>
            )}
            {mode === 'website' && isWebLead && onSpam && (
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onSpam(lead);
                }}
              >
                Spam
              </button>
            )}
            <button
              className="btn btn-ai"
              onClick={(e) => {
                e.stopPropagation();
                console.log(`${aiLabel} clicked`, lead);
              }}
            >
              {aiLabel}
            </button>
          </div>
          </div>
        );
      })}
    </>
  );

  if (bare) return Cards;

  return <div className="lead-grid">{Cards}</div>;
}
