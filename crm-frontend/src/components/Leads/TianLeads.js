// src/components/Leads/TianLeads.js
import React, { useEffect, useState } from 'react';
import './TianLeads.css';

const MESSAGE_PREVIEW_LIMIT = 100;

const getServiceLabel = (lead) =>
  lead.serviceLabel || lead.service || lead.industry_role || 'General Inquiry';

function LeadRequestCard({
  lead,
  onLeadClick,
  onSaveToCrm,
  onArchive,
  onSpam,
  onViewInPipeline,
  mode,
}) {
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const isWebLead = mode === 'website';
  const isCrmLead = mode === 'crm';
  const aiLabel = mode === 'website' ? 'AI Analyze' : 'AI Assist';
  const message = (lead.message || '').trim();
  const hasLongMessage = message.length > MESSAGE_PREVIEW_LIMIT;
  const serviceLabel = getServiceLabel(lead);
  const displayName = lead.displayName || lead.name || 'Unnamed Lead';
  const modalTitleId = `lead-message-modal-title-${String(
    lead.id ?? lead.lead_id ?? lead.universal_id ?? lead.created_at ?? displayName
  ).replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  useEffect(() => {
    if (!showMessageModal) return undefined;
    const onEsc = (event) => {
      if (event.key === 'Escape') setShowMessageModal(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [showMessageModal]);

  const handleReadMore = (event) => {
    event.stopPropagation();
    if (showFullMessage) {
      setShowFullMessage(false);
      return;
    }
    setShowFullMessage(true);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => setShowMessageModal(false);

  return (
    <>
      <div
        className="card lead-card"
        onClick={() => onLeadClick?.(lead)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' ? onLeadClick?.(lead) : null)}
      >
        <div className="lead-title-row">
          <h3>{displayName}</h3>
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
            {serviceLabel && (
              <p>
                <strong>Service:</strong> {serviceLabel}
              </p>
            )}
            {message && (
              <div className="lead-message-block">
                <p className="lead-message-line">
                  <strong>Msg:</strong>{' '}
                  <span
                    className={`lead-message-text-wrap ${
                      showFullMessage ? 'expanded' : 'collapsed'
                    }`}
                  >
                    <span className="lead-message-text">{message}</span>
                  </span>
                </p>
                {hasLongMessage && (
                  <div className="lead-message-controls">
                    <button
                      type="button"
                      className="lead-message-link"
                      onClick={handleReadMore}
                    >
                      {showFullMessage ? 'Show Less' : 'Read More'}
                    </button>
                  </div>
                )}
              </div>
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
            {(lead.pipelineStageLabel || lead.safePipelineStage || lead.safeStatus || lead.status) && (
              <p>
                <strong>Pipeline:</strong>{' '}
                {lead.pipelineStageLabel || lead.safePipelineStage || lead.safeStatus || lead.status}
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
            {serviceLabel && (
              <p>
                <strong>Service:</strong> {serviceLabel}
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

      {hasLongMessage && showMessageModal && (
        <div
          className="lead-message-modal-overlay"
          role="presentation"
          onClick={closeMessageModal}
        >
          <div
            className="lead-message-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="lead-message-modal-header">
              <h4 id={modalTitleId}>Lead Request Details</h4>
              <button
                type="button"
                className="lead-message-modal-close"
                onClick={closeMessageModal}
              >
                Close
              </button>
            </div>
            <p>
              <strong>Name:</strong> {displayName}
            </p>
            <p>
              <strong>Service:</strong> {serviceLabel}
            </p>
            <p className="lead-message-modal-content">
              <strong>Message:</strong> {message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

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
        const leadKey = isWebLead
          ? `web-${lead.id ?? lead.created_at}`
          : lead.id ?? lead.lead_id ?? lead.universal_id ?? lead.created_at;
        return (
          <LeadRequestCard
            key={leadKey}
            lead={lead}
            onLeadClick={onLeadClick}
            onSaveToCrm={onSaveToCrm}
            onArchive={onArchive}
            onSpam={onSpam}
            onViewInPipeline={onViewInPipeline}
            mode={mode}
          />
        );
      })}
    </>
  );

  if (bare) return Cards;

  return <div className="lead-grid">{Cards}</div>;
}
