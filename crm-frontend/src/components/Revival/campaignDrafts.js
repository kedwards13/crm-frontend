import { createCampaign } from '../../api/campaignsApi';

export const DEFAULT_REVIVAL_MESSAGE =
  'Hi {first_name}, we still have your {service_type} quote on file. Reply if you want us to get this back on the schedule.';

const text = (value) => String(value || '').trim();

export const normalizeQuoteSeed = (value) => {
  if (!value || typeof value !== 'object') return null;

  const quoteId = text(value.quote_id || value.quoteId || value.id);
  if (!quoteId) return null;

  return {
    quote_id: quoteId,
    customer_id: text(value.customer_id || value.customerId || value.customer?.id || ''),
    lead_id: text(value.lead_id || value.leadId || ''),
    customer_name: text(value.customer_name || value.customerName || value.name || ''),
    service_type: text(value.service_type || value.serviceType || ''),
    quote_total: Number(value.quote_total ?? value.estimated_total ?? value.total ?? 0) || 0,
    quote_status: text(value.quote_status || value.job_status || value.status || 'draft'),
    lifecycle_stage: text(value.lifecycle_stage || value.lifecycleStage || ''),
    address: text(value.address || ''),
    last_contact_at: value.last_contact_at || value.updated_at || value.created_at || null,
  };
};

export const normalizeQuoteSeeds = (values = []) => {
  const rows = Array.isArray(values) ? values : [values];
  const seen = new Set();

  return rows
    .map(normalizeQuoteSeed)
    .filter((row) => {
      if (!row?.quote_id || seen.has(row.quote_id)) return false;
      seen.add(row.quote_id);
      return true;
    });
};

export const buildRevivalCampaignRecipients = (quotes = []) =>
  normalizeQuoteSeeds(quotes).map((row) => ({
    quote_id: row.quote_id,
    customer_id: row.customer_id || undefined,
    lead_id: row.lead_id || undefined,
  }));

export const createRevivalCampaignDraft = async ({
  quotes = [],
  name = '',
  description = '',
  message = DEFAULT_REVIVAL_MESSAGE,
  channel = 'sms',
  media_urls = [],
} = {}) => {
  const recipients = buildRevivalCampaignRecipients(quotes);
  if (!recipients.length) {
    throw new Error('Select at least one revival quote first.');
  }

  const today = new Date().toISOString().slice(0, 10);
  return createCampaign({
    name: text(name) || `Revival Follow-up ${today}`,
    description: text(description) || 'Drafted from the revival workflow.',
    channel: text(channel) || 'sms',
    message: text(message) || DEFAULT_REVIVAL_MESSAGE,
    media_urls,
    recipients,
    audience_filter: {
      source: 'revival_builder',
      quote_ids: recipients.map((row) => row.quote_id),
    },
  });
};
