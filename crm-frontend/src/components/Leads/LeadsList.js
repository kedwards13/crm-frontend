import React from 'react';
import { Mail, Phone } from 'lucide-react';
import './LeadsList.css';

const getStatusLabel = (lead) =>
  String(lead.pipelineStageLabel || lead.safePipelineStage || lead.safeStatus || lead.status || 'New');

const getCompanyLabel = (lead) =>
  lead.company_name ||
  lead.company ||
  lead.business_name ||
  lead.serviceLabel ||
  lead.service ||
  'No company';

const getPhone = (lead) => lead.displayPhone || lead.phone_number || lead.primary_phone || '';
const getEmail = (lead) => lead.displayEmail || lead.email || lead.primary_email || '';

export default function LeadsList({ leads = [], view = 'grid', onLeadClick }) {
  return (
    <div className={`leads-list ${view === 'list' ? 'is-list' : 'is-grid'}`}>
      {leads.map((lead) => {
        const name = lead.displayName || lead.name || 'Unknown Lead';
        const status = getStatusLabel(lead);
        const company = getCompanyLabel(lead);
        const phone = getPhone(lead);
        const email = getEmail(lead);
        const key = lead.id ?? lead.lead_id ?? lead.universal_id ?? `${name}-${company}`;

        return (
          <article
            key={key}
            className='leads-list-card'
            role='button'
            tabIndex={0}
            onClick={() => onLeadClick?.(lead)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onLeadClick?.(lead);
            }}
          >
            <div className='leads-list-card__header'>
              <h3>{name}</h3>
              <span className='leads-list-card__status'>{status}</span>
            </div>

            <div className='leads-list-card__company'>{company}</div>

            <div className='leads-list-card__meta'>
              {phone ? <span>{phone}</span> : null}
              {email ? <span>{email}</span> : null}
            </div>

            <div className='leads-list-card__actions'>
              <button type='button' aria-label='Call lead' disabled={!phone}>
                <Phone size={16} />
              </button>
              <button type='button' aria-label='Email lead' disabled={!email}>
                <Mail size={16} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
