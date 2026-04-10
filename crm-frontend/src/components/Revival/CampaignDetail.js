import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  createCampaign,
  getCampaign,
  getCampaignRecipients,
  getCampaignStats,
  pauseCampaign,
} from '../../api/campaignsApi';
import { Button } from '../ui/button';
import './Campaigns.css';

const text = (value) => String(value || '').trim();

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.recipients)) return value.recipients;
  return [];
};

const humanize = (value) =>
  text(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase()) || 'Unknown';

const formatDate = (value) => {
  if (!value) return 'No activity yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity yet';
  return parsed.toLocaleString();
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const apiMessage = (error, fallback) =>
  text(
    error?.response?.data?.detail ||
      error?.response?.data?.error?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
  );

const campaignTone = (status) => {
  switch (text(status).toLowerCase()) {
    case 'sent':
    case 'delivered':
      return 'info';
    case 'replied':
      return 'success';
    case 'opted_out':
      return 'neutral';
    case 'approved':
      return 'success';
    case 'ready_for_approval':
      return 'warning';
    case 'sending':
    case 'running':
      return 'neutral';
    case 'completed':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'draft';
  }
};

function MetricBlock({ label, value }) {
  return (
    <div className="campaign-metric-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressBar({ label, value, detail }) {
  const width = Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100)));
  return (
    <div className="campaign-performance-row">
      <div className="campaign-performance-copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <div className="campaign-performance-bar">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function CampaignDetail() {
  const navigate = useNavigate();
  const { campaignId = '' } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState('');

  const loadDetail = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [campaignResponse, statsResponse, recipientsResponse] = await Promise.all([
        getCampaign(campaignId),
        getCampaignStats(campaignId),
        getCampaignRecipients(campaignId),
      ]);

      const recipientRows = toArray(recipientsResponse.data?.recipients || recipientsResponse.data).map((row) => ({
        ...row,
        id: text(row.id || row.recipient_id),
        recipient_id: text(row.recipient_id || row.id),
        status: text(row.status || row.send_status || 'queued').toLowerCase() || 'queued',
        customer_name: text(row.customer_name) || 'Unknown customer',
        phone: text(row.phone),
        quote_id: text(row.quote_id),
        quote_total: Number(row.quote_total ?? row.revenue ?? 0) || 0,
        reply: text(row.reply || row.response),
        message_body: text(row.message_body),
        last_activity: row.last_response_at || row.replied_at || row.sent_at || row.created_at || '',
      }));

      setCampaign(campaignResponse.data || null);
      setStats(statsResponse.data || null);
      setRecipients(recipientRows);
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to load campaign tracking.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const source = stats?.totals || {};
    const recipientsCount = Number(source.targets ?? campaign?.total_targets ?? recipients.length ?? 0) || 0;
    const sent = Number(source.sent ?? campaign?.sent ?? 0) || 0;
    const queued = Number(stats?.recipient_status?.queued ?? Math.max(0, recipientsCount - sent)) || 0;
    const failed = Number(source.failed ?? campaign?.failed ?? 0) || 0;
    const replies = Number(source.replied ?? campaign?.replied ?? 0) || 0;
    const optOuts = Number(source.opted_out ?? stats?.metrics?.opted_out_count ?? 0) || 0;
    return {
      recipients: recipientsCount,
      sent,
      queued,
      failed,
      replies,
      optOuts,
    };
  }, [campaign, recipients.length, stats]);

  const performance = useMemo(() => {
    const recipientsCount = totals.recipients || 0;
    const sent = totals.sent || 0;
    return {
      replyRate: sent ? totals.replies / sent : 0,
      deliveryRate: recipientsCount ? sent / recipientsCount : 0,
      failureRate: recipientsCount ? totals.failed / recipientsCount : 0,
    };
  }, [totals]);

  const filteredRecipients = useMemo(() => {
    const query = text(search).toLowerCase();
    return recipients.filter((row) => {
      if (filter === 'failed' && row.status !== 'failed' && !row.error_message) return false;
      if (filter === 'replied' && !row.reply) return false;
      if (filter === 'queued' && row.status !== 'queued') return false;
      if (!query) return true;

      return [
        row.customer_name,
        row.phone,
        row.quote_id,
        row.message_body,
        row.reply,
        row.status,
      ]
        .map((value) => text(value).toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [filter, recipients, search]);

  const buildRecipientPayload = (rows) =>
    rows
      .map((row) => ({
        quote_id: text(row.quote_id) || undefined,
        customer_id: text(row.customer_id) || undefined,
        lead_id: text(row.lead_id) || undefined,
      }))
      .filter((row) => row.quote_id || row.customer_id || row.lead_id);

  const createFollowOnCampaign = async ({ failedOnly = false } = {}) => {
    const sourceRows = failedOnly
      ? recipients.filter((row) => row.status === 'failed' || text(row.error_message))
      : recipients;
    const payloadRecipients = buildRecipientPayload(sourceRows);
    if (!payloadRecipients.length) {
      throw new Error(failedOnly ? 'No failed recipients are available to resend.' : 'No recipients are available.');
    }

    const suffix = failedOnly ? 'Retry' : 'Copy';
    const message =
      text(campaign?.message) ||
      text(campaign?.template_body) ||
      text(sourceRows.find((row) => row.message_body)?.message_body) ||
      'Hi {first_name}, we wanted to follow up on your quote.';
    const mediaUrls = sourceRows.find((row) => Array.isArray(row.media_urls) && row.media_urls.length)?.media_urls || [];

    const response = await createCampaign({
      name: `${text(campaign?.name) || 'Campaign'} ${suffix}`,
      description: text(campaign?.description) || 'Created from campaign tracking.',
      channel: text(campaign?.channel || campaign?.template_channel) || 'sms',
      message,
      media_urls: mediaUrls,
      recipients: payloadRecipients,
      audience_filter: {
        source: failedOnly ? 'revival_campaign_retry' : 'revival_campaign_duplicate',
        campaign_id: campaignId,
        quote_ids: payloadRecipients.map((row) => row.quote_id).filter(Boolean),
      },
    });

    return response.data;
  };

  const handlePause = async () => {
    setWorking(true);
    try {
      await pauseCampaign(campaignId);
      await loadDetail({ quiet: true });
      toast.success('Campaign paused and moved back to draft.');
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to pause campaign.'));
    } finally {
      setWorking(false);
    }
  };

  const handleDuplicate = async () => {
    setWorking(true);
    try {
      const nextCampaign = await createFollowOnCampaign();
      toast.success('Duplicate campaign created.');
      navigate('/revival/campaigns', {
        state: {
          campaignId: nextCampaign?.id,
          createdCampaignId: nextCampaign?.id,
        },
      });
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to duplicate campaign.'));
    } finally {
      setWorking(false);
    }
  };

  const handleRetryFailed = async () => {
    setWorking(true);
    try {
      const nextCampaign = await createFollowOnCampaign({ failedOnly: true });
      toast.success('Retry campaign draft created from failed recipients.');
      navigate('/revival/campaigns', {
        state: {
          campaignId: nextCampaign?.id,
          createdCampaignId: nextCampaign?.id,
        },
      });
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to create a retry campaign.'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="revival-campaigns-page campaign-detail-page">
        <p className="revival-campaigns-copy">Loading campaign tracking...</p>
      </div>
    );
  }

  return (
    <div className="revival-campaigns-page campaign-detail-page">
      <section className="campaign-context-header">
        <div className="campaign-context-heading">
          <p className="revival-campaigns-eyebrow">Campaign Tracking</p>
          <div className="campaign-context-title-row">
            <div>
              <h1>{text(campaign?.name) || 'Campaign'}</h1>
              <div className="campaign-context-meta">
                <span className={`campaign-pill ${campaignTone(campaign?.status)}`}>{humanize(campaign?.status)}</span>
                <span>{humanize(campaign?.channel || campaign?.template_channel || 'sms')}</span>
                <span>Created {formatDate(campaign?.created_at)}</span>
              </div>
            </div>
            <div className="campaign-context-actions">
              <Button variant="ghost" onClick={() => navigate('/revival/campaigns', { state: { campaignId } })}>
                Open Workspace
              </Button>
              <Button variant="outline" onClick={handleRetryFailed} disabled={working || !totals.failed}>
                Resend Failed
              </Button>
              <Button variant="outline" onClick={handlePause} disabled={working}>
                Pause Campaign
              </Button>
              <Button variant="primary" onClick={handleDuplicate} loading={working}>
                Duplicate Campaign
              </Button>
            </div>
          </div>
        </div>

        <div className="campaign-context-stats campaign-detail-stats">
          <MetricBlock label="Recipients" value={totals.recipients} />
          <MetricBlock label="Sent" value={totals.sent} />
          <MetricBlock label="Queued" value={totals.queued} />
          <MetricBlock label="Failed" value={totals.failed} />
          <MetricBlock label="Replies" value={totals.replies} />
          <MetricBlock label="Opt Outs" value={totals.optOuts} />
        </div>
      </section>

      <div className="campaign-detail-grid">
        <section className="campaign-section-card">
          <div className="section-head">
            <div>
              <h2>Message Performance</h2>
              <p>Track delivery, replies, and failure rate without leaving the campaign.</p>
            </div>
          </div>

          <div className="campaign-performance-stack">
            <ProgressBar
              label="Reply Rate"
              value={performance.replyRate}
              detail={`${formatPercent(performance.replyRate)} of sent recipients replied`}
            />
            <ProgressBar
              label="Delivery Rate"
              value={performance.deliveryRate}
              detail={`${formatPercent(performance.deliveryRate)} of recipients were sent a message`}
            />
            <ProgressBar
              label="Failure Rate"
              value={performance.failureRate}
              detail={`${formatPercent(performance.failureRate)} of recipients failed`}
            />
          </div>
        </section>

        <section className="campaign-section-card">
          <div className="section-head">
            <div>
              <h2>Action Panel</h2>
              <p>Fast follow-on actions for operators who need to recover campaign performance.</p>
            </div>
          </div>

          <div className="campaign-detail-actions-card">
            <button type="button" className="campaign-detail-action" onClick={handleRetryFailed} disabled={working || !totals.failed}>
              <strong>Resend Failed</strong>
              <span>Create a retry draft from failed recipients only.</span>
            </button>
            <button type="button" className="campaign-detail-action" onClick={handlePause} disabled={working}>
              <strong>Pause Campaign</strong>
              <span>Return the campaign to draft without changing send APIs.</span>
            </button>
            <button type="button" className="campaign-detail-action" onClick={handleDuplicate} disabled={working}>
              <strong>Duplicate Campaign</strong>
              <span>Clone recipients and message into a fresh draft.</span>
            </button>
          </div>
        </section>

        <section className="campaign-section-card campaign-detail-table-card">
          <div className="section-head">
            <div>
              <h2>Recipients</h2>
              <p>Expand rows to inspect message/reply context and last activity.</p>
            </div>
            <div className="campaign-detail-toolbar">
              <div className="campaign-tab-row">
                <button
                  type="button"
                  className={`campaign-tab ${filter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`campaign-tab ${filter === 'queued' ? 'is-active' : ''}`}
                  onClick={() => setFilter('queued')}
                >
                  Queued
                </button>
                <button
                  type="button"
                  className={`campaign-tab ${filter === 'failed' ? 'is-active' : ''}`}
                  onClick={() => setFilter('failed')}
                >
                  Failed
                </button>
                <button
                  type="button"
                  className={`campaign-tab ${filter === 'replied' ? 'is-active' : ''}`}
                  onClick={() => setFilter('replied')}
                >
                  Replies
                </button>
              </div>
              <input
                className="campaign-search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search recipients, phones, replies, or messages"
              />
            </div>
          </div>

          <div className="review-table-wrap campaign-detail-table-wrap">
            <table className="review-table campaign-review-table campaign-detail-table">
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '360px' }} />
                <col style={{ width: '260px' }} />
                <col style={{ width: '180px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Quote</th>
                  <th>Status</th>
                  <th>Message Sent</th>
                  <th>Reply</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipients.length ? (
                  filteredRecipients.map((row) => {
                    const expanded = expandedRowId === row.recipient_id;
                    return (
                      <React.Fragment key={row.recipient_id}>
                        <tr
                          className={expanded ? 'is-expanded' : ''}
                          onClick={() => setExpandedRowId(expanded ? '' : row.recipient_id)}
                        >
                          <td>
                            <div className="table-primary">{row.customer_name}</div>
                            <div className="table-subcopy">Quote #{row.quote_id || 'N/A'}</div>
                          </td>
                          <td>{row.phone || 'No phone'}</td>
                          <td>{formatCurrency(row.quote_total)}</td>
                          <td>
                            <span className={`campaign-pill ${campaignTone(row.status)}`}>{humanize(row.status)}</span>
                          </td>
                          <td>
                            <div className="reply-preview campaign-message-preview" title={row.message_body}>
                              {row.message_body || text(campaign?.message) || text(campaign?.template_body) || 'No message body'}
                            </div>
                          </td>
                          <td>
                            <div className="reply-preview" title={row.reply || row.error_message || ''}>
                              {row.reply || row.error_message || 'No reply yet'}
                            </div>
                          </td>
                          <td>{formatDate(row.last_activity)}</td>
                        </tr>
                        {expanded ? (
                          <tr className="campaign-thread-row">
                            <td colSpan="7">
                              <div className="campaign-thread-card">
                                <div>
                                  <strong>Message Sent</strong>
                                  <p>{row.message_body || text(campaign?.message) || text(campaign?.template_body) || 'No message body'}</p>
                                </div>
                                <div>
                                  <strong>Reply</strong>
                                  <p>{row.reply || row.error_message || 'No reply or failure details available.'}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state-row">
                      <p className="empty-state">No recipients matched the current filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
