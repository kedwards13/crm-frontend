import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import revivalApi from '../../api/revivalApi';
import {
  autoEnrollCampaign,
  createCampaign,
  getCampaignPreview,
  getCampaignRecipients,
  listCampaigns,
  optimizeCampaignMessage,
  sendCampaignWithOverrides,
  updateCampaign,
} from '../../api/campaignsApi';
import { Button } from '../ui/button';
import {
  buildRevivalCampaignRecipients,
  DEFAULT_REVIVAL_MESSAGE,
  normalizeQuoteSeeds,
} from './campaignDrafts';
import './Campaigns.css';

const LAST_CAMPAIGN_KEY = 'revival:lastCampaignId';

const text = (value) => String(value || '').trim();
const digits = (value) => String(value || '').replace(/\D/g, '');

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.recipients)) return value.recipients;
  return [];
};

const uniqueStrings = (values = []) => [...new Set(values.map(text).filter(Boolean))];

const parseMediaUrls = (value = '') =>
  uniqueStrings(
    String(value || '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );

const serializeMediaUrls = (values = []) => uniqueStrings(values).join('\n');

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'No recent activity';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No recent activity';
  return parsed.toLocaleString();
};

const humanize = (value) =>
  text(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase()) || 'Unknown';

const defaultCampaignName = () => `Revival Follow-up ${new Date().toISOString().slice(0, 10)}`;

const buildEmptyForm = () => ({
  name: defaultCampaignName(),
  description: 'Follow up with revival-ready quotes and get direct replies.',
  channel: 'sms',
  message: DEFAULT_REVIVAL_MESSAGE,
  goal: '',
  mediaUrlsText: '',
});

const campaignTone = (status) => {
  switch (text(status).toLowerCase()) {
    case 'sent':
    case 'delivered':
      return 'info';
    case 'replied':
      return 'success';
    case 'opted_out':
      return 'neutral';
    case 'paused':
      return 'draft';
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

const apiMessage = (error, fallback) =>
  text(
    error?.response?.data?.detail ||
      error?.response?.data?.error?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
  );

const getStoredLastCampaignId = () =>
  (typeof window !== 'undefined' && text(window.localStorage.getItem(LAST_CAMPAIGN_KEY))) || '';

const setStoredLastCampaignId = (campaignId) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_CAMPAIGN_KEY, text(campaignId));
};

const clearStoredLastCampaignId = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LAST_CAMPAIGN_KEY);
};

const buildMembershipMap = (campaigns = []) => {
  const map = new Map();
  const attach = (key, membership) => {
    if (!key) return;
    const existing = map.get(key) || [];
    if (existing.some((item) => item.id === membership.id)) return;
    map.set(key, [...existing, membership]);
  };

  campaigns.forEach((campaign) => {
    const membership = {
      id: text(campaign.id),
      name: text(campaign.name) || 'Campaign',
      status: text(campaign.status) || 'draft',
      channel: text(campaign.channel) || 'sms',
    };
    const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
    recipients.forEach((recipient) => {
      attach(`quote:${text(recipient.quote_id)}`, membership);
      attach(`customer:${text(recipient.customer_id)}`, membership);
      attach(`phone:${digits(recipient.phone)}`, membership);
    });
  });

  return map;
};

const mergeReviewRows = (recipientRows = [], previewRows = []) => {
  const recipientMap = new Map();
  const previewMap = new Map();

  recipientRows.forEach((row) => {
    const id = text(row.recipient_id || row.id);
    if (id) recipientMap.set(id, row);
  });

  previewRows.forEach((row) => {
    const id = text(row.recipient_id || row.id);
    if (id) previewMap.set(id, row);
  });

  const orderedIds = uniqueStrings([
    ...recipientRows.map((row) => row.recipient_id || row.id),
    ...previewRows.map((row) => row.recipient_id || row.id),
  ]);

  const statusRank = {
    queued: 0,
    failed: 1,
    sent: 2,
    replied: 3,
    opted_out: 4,
  };

  return orderedIds
    .map((id) => {
      const recipient = recipientMap.get(id) || {};
      const preview = previewMap.get(id) || {};
      const status = text(recipient.status || preview.status || 'queued').toLowerCase() || 'queued';
      const mediaUrls =
        Array.isArray(preview.media_urls) && preview.media_urls.length
          ? preview.media_urls
          : Array.isArray(recipient.media_urls)
            ? recipient.media_urls
            : [];

      return {
        ...recipient,
        ...preview,
        id,
        recipient_id: id,
        status,
        send_status: status,
        eligible: preview.eligible ?? status === 'queued',
        message_body: text(preview.message_body || recipient.message_body),
        media_urls: mediaUrls,
        error_message: text(recipient.error_message || preview.error),
        skip_reason: text(preview.skip_reason || ''),
        customer_name: text(preview.customer_name || recipient.customer_name) || 'Unknown recipient',
        phone: text(preview.phone || recipient.phone),
        quote_id: text(preview.quote_id || recipient.quote_id),
        customer_id: text(preview.customer_id || recipient.customer_id),
        lead_id: text(preview.lead_id || recipient.lead_id),
        quote_total:
          Number(preview.quote_total ?? recipient.quote_total ?? preview.revenue ?? recipient.revenue ?? 0) || 0,
        revenue:
          Number(preview.revenue ?? recipient.revenue ?? preview.quote_total ?? recipient.quote_total ?? 0) || 0,
        reply: text(preview.reply || recipient.reply || recipient.response),
        lifecycle_stage: text(preview.lifecycle_stage || recipient.lifecycle_stage),
        sent_at: recipient.sent_at || preview.sent_at || null,
        last_response_at: recipient.last_response_at || preview.last_response_at || null,
      };
    })
    .sort((left, right) => {
      const leftRank = statusRank[left.status] ?? 99;
      const rightRank = statusRank[right.status] ?? 99;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.customer_name.localeCompare(right.customer_name);
    });
};

const buildFormFromCampaign = (campaign, rows = []) => {
  const seededMediaUrls = rows.find((row) => Array.isArray(row.media_urls) && row.media_urls.length)?.media_urls || [];
  return {
    name: text(campaign?.name) || defaultCampaignName(),
    description: text(campaign?.description) || 'Follow up with revival-ready quotes and get direct replies.',
    channel: text(campaign?.channel).toLowerCase() || 'sms',
    message: text(campaign?.message || campaign?.template_body) || DEFAULT_REVIVAL_MESSAGE,
    mediaUrlsText: serializeMediaUrls(seededMediaUrls),
  };
};

function MetricBlock({ label, value }) {
  return (
    <div className="campaign-metric-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MembershipBadges({ memberships = [] }) {
  if (!memberships.length) return <span className="campaign-membership-empty">No campaigns</span>;
  return (
    <div className="campaign-membership-list">
      {memberships.map((membership) => (
        <span key={`${membership.id}-${membership.name}`} className={`campaign-pill ${campaignTone(membership.status)}`}>
          {membership.name}
        </span>
      ))}
    </div>
  );
}

export default function Campaigns() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCampaignId =
    text(searchParams.get('campaign_id')) ||
    text(location.state?.campaignId || location.state?.createdCampaignId) ||
    getStoredLastCampaignId();

  const [campaigns, setCampaigns] = useState([]);
  const [eligibleRows, setEligibleRows] = useState([]);
  const [reviewRows, setReviewRows] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState(initialCampaignId);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState([]);
  const [draftsById, setDraftsById] = useState({});
  const [form, setForm] = useState(buildEmptyForm);
  const [poolSearch, setPoolSearch] = useState('');
  const [poolTab, setPoolTab] = useState('revival');
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const draftsRef = useRef({});
  const reviewRowsRef = useRef([]);
  const loadedTemplateRef = useRef({ campaignId: '', message: '', mediaUrlsText: '' });
  const seedSignatureRef = useRef('');

  useEffect(() => {
    draftsRef.current = draftsById;
  }, [draftsById]);

  useEffect(() => {
    reviewRowsRef.current = reviewRows;
  }, [reviewRows]);

  const seedQuotes = useMemo(() => {
    const fromState = normalizeQuoteSeeds(location.state?.seedQuotes || location.state?.quotes || []);
    const fromQuery = normalizeQuoteSeeds(
      text(searchParams.get('quote_id')) ? [{ quote_id: searchParams.get('quote_id') }] : []
    );
    return normalizeQuoteSeeds([...fromState, ...fromQuery]);
  }, [location.state, searchParams]);

  const activeCampaign = useMemo(
    () => campaigns.find((row) => text(row.id) === text(activeCampaignId)) || null,
    [campaigns, activeCampaignId]
  );

  const membershipMap = useMemo(() => buildMembershipMap(campaigns), [campaigns]);

  const eligibleLookup = useMemo(() => {
    const byQuote = new Map();
    const byCustomer = new Map();
    const byPhone = new Map();
    eligibleRows.forEach((row) => {
      const normalized = {
        ...row,
        memberships: membershipMap.get(`quote:${text(row.quote_id)}`) ||
          membershipMap.get(`customer:${text(row.customer_id)}`) ||
          membershipMap.get(`phone:${digits(row.phone)}`) ||
          [],
      };
      if (text(row.quote_id)) byQuote.set(text(row.quote_id), normalized);
      if (text(row.customer_id)) byCustomer.set(text(row.customer_id), normalized);
      if (digits(row.phone)) byPhone.set(digits(row.phone), normalized);
    });
    return { byQuote, byCustomer, byPhone };
  }, [eligibleRows, membershipMap]);

  const eligibleRowsWithMemberships = useMemo(
    () =>
      eligibleRows.map((row) => ({
        ...row,
        memberships:
          eligibleLookup.byQuote.get(text(row.quote_id))?.memberships ||
          eligibleLookup.byCustomer.get(text(row.customer_id))?.memberships ||
          [],
      })),
    [eligibleRows, eligibleLookup]
  );

  const workspaceRows = useMemo(() => {
    const activeMembership = activeCampaign
      ? [
          {
            id: text(activeCampaign.id),
            name: text(activeCampaign.name) || 'Campaign',
            status: text(activeCampaign.status) || 'draft',
            channel: text(activeCampaign.channel) || 'sms',
          },
        ]
      : [];

    return reviewRows.map((row) => {
      const lookup =
        eligibleLookup.byQuote.get(text(row.quote_id)) ||
        eligibleLookup.byCustomer.get(text(row.customer_id)) ||
        eligibleLookup.byPhone.get(digits(row.phone));
      return {
        ...row,
        address: text(lookup?.address),
        memberships: activeMembership.length ? activeMembership : lookup?.memberships || [],
        campaign_name: text(activeCampaign?.name) || 'Campaign',
        last_activity: row.last_response_at || row.sent_at || '',
      };
    });
  }, [activeCampaign, eligibleLookup, reviewRows]);

  const selectedQuoteRows = useMemo(() => {
    const map = new Map(eligibleRowsWithMemberships.map((row) => [text(row.quote_id), row]));
    return selectedQuoteIds.map((id) => map.get(text(id))).filter(Boolean);
  }, [eligibleRowsWithMemberships, selectedQuoteIds]);

  const poolRows = useMemo(() => {
    if (poolTab === 'campaign') return workspaceRows;
    return onlyUnassigned
      ? eligibleRowsWithMemberships.filter((row) => !(row.memberships || []).length)
      : eligibleRowsWithMemberships;
  }, [poolTab, workspaceRows, eligibleRowsWithMemberships, onlyUnassigned]);

  const filteredPoolRows = useMemo(() => {
    const query = text(poolSearch).toLowerCase();
    if (!query) return poolRows;
    return poolRows.filter((row) =>
      [
        row.customer_name,
        row.phone,
        row.address,
        row.quote_status,
        row.status,
        ...(row.memberships || []).map((membership) => membership.name),
      ]
        .map((value) => text(value).toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [poolRows, poolSearch]);

  const resolveRowMessage = (row, draftMap = draftsRef.current, baseMessage = form.message) =>
    text(draftMap[row.recipient_id]) || text(row.message_body) || text(baseMessage);

  const isSendableRow = (row, message = resolveRowMessage(row)) =>
    text(row.status).toLowerCase() === 'queued' && row.eligible !== false && text(message).length > 0;

  const sendableRows = useMemo(
    () => workspaceRows.filter((row) => isSendableRow(row, resolveRowMessage(row, draftsById, form.message))),
    [workspaceRows, draftsById, form.message] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const summary = useMemo(
    () =>
      workspaceRows.reduce(
        (acc, row) => {
          acc.total += 1;
          acc[row.status] = (acc[row.status] || 0) + 1;
          if (isSendableRow(row, resolveRowMessage(row, draftsById, form.message))) {
            acc.ready += 1;
          }
          if (row.reply) acc.replies += 1;
          return acc;
        },
        {
          total: 0,
          ready: 0,
          queued: 0,
          sent: 0,
          failed: 0,
          replied: 0,
          opted_out: 0,
          replies: 0,
        }
      ),
    [workspaceRows, draftsById, form.message] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const recentReplies = useMemo(
    () =>
      workspaceRows
        .filter((row) => row.reply)
        .sort((left, right) => String(right.last_activity || '').localeCompare(String(left.last_activity || '')))
        .slice(0, 5),
    [workspaceRows]
  );

  const recentFailures = useMemo(
    () =>
      workspaceRows
        .filter((row) => row.status === 'failed' || row.error_message)
        .slice(0, 5),
    [workspaceRows]
  );

  const sendHistory = useMemo(
    () =>
      workspaceRows
        .filter((row) => row.sent_at)
        .sort((left, right) => String(right.sent_at || '').localeCompare(String(left.sent_at || '')))
        .slice(0, 5),
    [workspaceRows]
  );

  const headerStats = useMemo(() => {
    const recipients = activeCampaign ? workspaceRows.length || Number(activeCampaign.total_targets || 0) : selectedQuoteRows.length;
    const sent = activeCampaign ? Number(activeCampaign.sent || summary.sent || 0) : 0;
    const failed = activeCampaign ? Number(activeCampaign.failed || summary.failed || 0) : 0;
    const queued = activeCampaign
      ? Number(summary.queued || Math.max(0, recipients - sent - failed))
      : selectedQuoteRows.length;
    return { recipients, sent, failed, queued };
  }, [activeCampaign, selectedQuoteRows.length, summary.failed, summary.queued, summary.sent, workspaceRows.length]);

  const loadCampaignList = async () => {
    const response = await listCampaigns();
    const rows = toArray(response.data).sort((left, right) =>
      String(right.created_at || '').localeCompare(String(left.created_at || ''))
    );
    setCampaigns(rows);
    return rows;
  };

  const loadEligibleList = async () => {
    const response = await revivalApi.getEligible();
    const rows = normalizeQuoteSeeds([...seedQuotes, ...toArray(response.data)]);
    setEligibleRows(rows);
    return rows;
  };

  const loadWorkspace = async (
    campaignId,
    { refreshPreview = false, replaceDrafts = false, campaignSnapshot = null } = {}
  ) => {
    if (!text(campaignId)) {
      setReviewRows([]);
      setSelectedReviewIds([]);
      return [];
    }

    setReviewLoading(true);
    try {
      const [recipientsResponse, previewResponse] = await Promise.all([
        getCampaignRecipients(campaignId),
        getCampaignPreview(campaignId, {
          status: 'queued',
          page_size: 500,
          ...(refreshPreview ? { refresh: 1 } : {}),
        }),
      ]);

      const rows = mergeReviewRows(
        toArray(recipientsResponse.data?.recipients || recipientsResponse.data),
        toArray(previewResponse.data)
      );

      const nextForm = buildFormFromCampaign(campaignSnapshot || activeCampaign, rows);
      setReviewRows(rows);
      setForm((prev) => ({
        ...prev,
        ...nextForm,
        goal: prev.goal || '',
      }));
      setDraftsById((prev) => {
        const next = {};
        rows.forEach((row) => {
          const existingDraft = replaceDrafts ? '' : text(prev[row.recipient_id]);
          next[row.recipient_id] = existingDraft || text(row.message_body) || nextForm.message;
        });
        return next;
      });
      setSelectedReviewIds((prev) => {
        if (prev.length && !replaceDrafts) {
          return prev.filter((id) =>
            rows.some((row) => row.recipient_id === id && isSendableRow(row, resolveRowMessage(row)))
          );
        }
        return rows
          .filter((row) => isSendableRow(row, text(row.message_body) || nextForm.message))
          .map((row) => row.recipient_id);
      });

      loadedTemplateRef.current = {
        campaignId: text(campaignId),
        message: nextForm.message,
        mediaUrlsText: nextForm.mediaUrlsText,
      };
      setStoredLastCampaignId(campaignId);
      return rows;
    } finally {
      setReviewLoading(false);
    }
  };

  const loadAll = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [campaignRows] = await Promise.all([loadCampaignList(), loadEligibleList()]);
      if (!text(activeCampaignId)) {
        const preferred = getStoredLastCampaignId();
        if (preferred) setActiveCampaignId(preferred);
      }
      return campaignRows;
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to load revival campaigns.'));
      return [];
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seedQuotes.length) return;
    const signature = seedQuotes.map((row) => row.quote_id).sort().join(',');
    if (seedSignatureRef.current === signature) return;
    seedSignatureRef.current = signature;
    setSelectedQuoteIds((prev) => uniqueStrings([...prev, ...seedQuotes.map((row) => row.quote_id)]));
    toast.info(
      `${seedQuotes.length} revival ${seedQuotes.length === 1 ? 'row was' : 'rows were'} loaded into the workspace.`
    );
  }, [seedQuotes]);

  useEffect(() => {
    if (!text(activeCampaignId) || loading) return;
    loadWorkspace(activeCampaignId, { campaignSnapshot: activeCampaign }).catch((error) =>
      toast.error(apiMessage(error, 'Unable to load campaign workspace.'))
    );
  }, [activeCampaignId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadCampaign = (campaign) => {
    const campaignId = text(campaign?.id);
    if (!campaignId) return;
    setActiveCampaignId(campaignId);
    setPoolTab('campaign');
    setStoredLastCampaignId(campaignId);
    toast.info(`${campaign.name || 'Campaign'} loaded into the workspace.`);
  };

  const handlePoolToggle = (row) => {
    if (poolTab === 'campaign') return;
    const quoteId = text(row.quote_id);
    if (!quoteId) return;

    const alreadySelected = selectedQuoteIds.includes(quoteId);
    if (!alreadySelected && Array.isArray(row.memberships) && row.memberships.length) {
      const existingName = row.memberships[0]?.name || 'another campaign';
      const approved = window.confirm(
        `This recipient is already part of ${existingName}. Add anyway?`
      );
      if (!approved) return;
    }

    setSelectedQuoteIds((prev) =>
      alreadySelected ? prev.filter((id) => id !== quoteId) : [...prev, quoteId]
    );
  };

  const handleToggleVisiblePool = () => {
    if (poolTab === 'campaign') return;
    const visibleIds = filteredPoolRows.map((row) => text(row.quote_id)).filter(Boolean);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedQuoteIds.includes(id));
    setSelectedQuoteIds((prev) =>
      allSelected ? prev.filter((id) => !visibleIds.includes(id)) : uniqueStrings([...prev, ...visibleIds])
    );
  };

  const handleToggleQueuedRows = () => {
    const queuedIds = sendableRows.map((row) => row.recipient_id);
    const allSelected = queuedIds.length > 0 && queuedIds.every((id) => selectedReviewIds.includes(id));
    setSelectedReviewIds((prev) =>
      allSelected ? prev.filter((id) => !queuedIds.includes(id)) : uniqueStrings([...prev, ...queuedIds])
    );
  };

  const handleReviewToggle = (recipientId) => {
    const normalized = text(recipientId);
    setSelectedReviewIds((prev) =>
      prev.includes(normalized) ? prev.filter((id) => id !== normalized) : [...prev, normalized]
    );
  };

  const handleResetWorkspace = () => {
    setActiveCampaignId('');
    setReviewRows([]);
    setSelectedReviewIds([]);
    setDraftsById({});
    setForm(buildEmptyForm());
    setPoolTab('revival');
    clearStoredLastCampaignId();
    toast.info('Workspace reset for a new draft.');
  };

  const patchCampaignStatus = async (campaignId, status) => {
    const response = await updateCampaign(campaignId, { status });
    const nextCampaign = response.data;
    setCampaigns((prev) => {
      const exists = prev.some((row) => text(row.id) === text(campaignId));
      if (!exists) return [nextCampaign, ...prev];
      return prev.map((row) => (text(row.id) === text(campaignId) ? nextCampaign : row));
    });
    return nextCampaign;
  };

  const ensureCampaignApproved = async (campaignId, campaignSnapshot = null) => {
    let snapshot = campaignSnapshot || activeCampaign;
    let status = text(snapshot?.status).toLowerCase();

    if (status === 'approved') return snapshot;
    if (status === 'completed' || status === 'failed') {
      snapshot = await patchCampaignStatus(campaignId, 'draft');
      status = 'draft';
    }
    if (!status || status === 'draft') {
      snapshot = await patchCampaignStatus(campaignId, 'ready_for_approval');
      status = 'ready_for_approval';
    }
    if (status === 'ready_for_approval') {
      snapshot = await patchCampaignStatus(campaignId, 'approved');
    }
    return snapshot;
  };

  const saveCampaignInternal = async ({ targetStatus = '', forceRefreshDrafts = false } = {}) => {
    const name = text(form.name) || defaultCampaignName();
    const description = text(form.description);
    const message = text(form.message);
    const mediaUrls = parseMediaUrls(form.mediaUrlsText);

    if (!message) {
      throw new Error('Base message is required before saving.');
    }

    const selectedSeeds = selectedQuoteRows;
    let campaignId = text(activeCampaignId);
    let snapshot = activeCampaign;

    if (!campaignId) {
      if (!selectedSeeds.length) {
        throw new Error('Select at least one recipient before creating a campaign.');
      }
      const response = await createCampaign({
        name,
        description,
        channel: form.channel,
        message,
        media_urls: mediaUrls,
        recipients: buildRevivalCampaignRecipients(selectedSeeds),
        audience_filter: {
          source: 'revival_builder',
          quote_ids: selectedSeeds.map((row) => row.quote_id),
        },
      });
      snapshot = response.data;
      campaignId = text(response.data?.id);
      setActiveCampaignId(campaignId);
    } else {
      const response = await updateCampaign(campaignId, {
        name,
        description,
        channel: form.channel,
        message,
        media_urls: mediaUrls,
      });
      snapshot = response.data;

      const existingQuoteIds = new Set(reviewRowsRef.current.map((row) => text(row.quote_id)).filter(Boolean));
      const missingRecipients = selectedSeeds.filter((row) => !existingQuoteIds.has(text(row.quote_id)));
      for (const row of missingRecipients) {
        await autoEnrollCampaign({
          campaign_id: campaignId,
          quote_id: row.quote_id,
          channel: form.channel,
        });
      }
    }

    if (text(targetStatus).toLowerCase() === 'approved') {
      snapshot = await ensureCampaignApproved(campaignId, snapshot);
    }

    await loadCampaignList();

    const baseline = loadedTemplateRef.current;
    const shouldRefreshDrafts =
      forceRefreshDrafts ||
      !baseline.campaignId ||
      text(baseline.campaignId) !== campaignId ||
      text(baseline.message) !== message ||
      text(baseline.mediaUrlsText) !== serializeMediaUrls(mediaUrls);

    const rows = await loadWorkspace(campaignId, {
      refreshPreview: shouldRefreshDrafts,
      replaceDrafts: shouldRefreshDrafts,
      campaignSnapshot: snapshot,
    });

    setStoredLastCampaignId(campaignId);
    return { campaignId, snapshot, rows };
  };

  const handleSaveDraft = async () => {
    setWorking(true);
    try {
      await saveCampaignInternal();
      toast.success('Campaign draft saved.');
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to save campaign.'));
    } finally {
      setWorking(false);
    }
  };

  const handleRefreshDrafts = async () => {
    setWorking(true);
    try {
      await saveCampaignInternal({ forceRefreshDrafts: true });
      toast.success('Queued drafts refreshed from the current template.');
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to refresh drafts.'));
    } finally {
      setWorking(false);
    }
  };

  const handleOptimize = async () => {
    const message = text(form.message);
    if (!message) {
      toast.info('Write the base message before using AI Optimize.');
      return;
    }
    setWorking(true);
    try {
      const response = await optimizeCampaignMessage({
        message,
        channel: form.channel,
        goal: text(form.goal) || undefined,
      });
      setForm((prev) => ({
        ...prev,
        message: text(response.data?.message) || prev.message,
      }));
      toast.success('Base message optimized. Refresh drafts to apply it to queued recipients.');
    } catch (error) {
      toast.error(apiMessage(error, 'AI Optimize failed.'));
    } finally {
      setWorking(false);
    }
  };

  const handleApproveCampaign = async () => {
    setWorking(true);
    try {
      await saveCampaignInternal({ targetStatus: 'approved' });
      toast.success('Campaign approved.');
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to approve campaign.'));
    } finally {
      setWorking(false);
    }
  };

  const sendRows = async (rowsToSend, { sendAllLatest = false } = {}) => {
    if (!rowsToSend.length) {
      throw new Error('Choose at least one queued recipient to send.');
    }

    const saved = await saveCampaignInternal({ targetStatus: 'approved' });
    const latestRows = saved.rows || reviewRowsRef.current;
    const latestIds = new Set(rowsToSend.map((row) => row.recipient_id));
    const sourceRows = sendAllLatest ? latestRows : latestRows.filter((row) => latestIds.has(row.recipient_id));
    const sendableSelection = sourceRows
      .map((row) => ({
        ...row,
        resolved_message: resolveRowMessage(row),
      }))
      .filter((row) => isSendableRow(row, row.resolved_message));

    if (!sendableSelection.length) {
      throw new Error('No queued recipients are ready to send.');
    }

    const response = await sendCampaignWithOverrides(saved.campaignId, {
      sync: 1,
      recipient_ids: sendableSelection.map((row) => row.recipient_id),
      overrides: sendableSelection.map((row) => ({
        recipient_id: row.recipient_id,
        custom_message: row.resolved_message,
      })),
      media_urls: parseMediaUrls(form.mediaUrlsText),
    });

    await loadCampaignList();
    await loadWorkspace(saved.campaignId, { campaignSnapshot: saved.snapshot });

    const result = response.data?.result || {};
    const sent = Number(result.sent ?? result.sent_count ?? 0);
    const failed = Number(result.failed ?? result.failed_count ?? 0);
    const queued = Number(result.remaining_queued ?? 0);
    toast.success(`Send finished. Sent ${sent}, failed ${failed}, queued ${queued}.`);
  };

  const handleSendSelected = async () => {
    setWorking(true);
    try {
      const rowsToSend = workspaceRows.filter((row) => selectedReviewIds.includes(row.recipient_id));
      await sendRows(rowsToSend);
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to send selected recipients.'));
    } finally {
      setWorking(false);
    }
  };

  const handleSendAllQueued = async () => {
    setWorking(true);
    try {
      await sendRows(sendableRows, { sendAllLatest: true });
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to send queued recipients.'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="revival-campaigns-page">
        <p className="revival-campaigns-copy">Loading campaign workspace...</p>
      </div>
    );
  }

  return (
    <div className="revival-campaigns-page">
      <section className="campaign-context-header">
        <div className="campaign-context-heading">
          <p className="revival-campaigns-eyebrow">Campaign Workspace</p>
          <div className="campaign-context-title-row">
            <div>
              <h1>{text(activeCampaign?.name) || text(form.name) || 'New Revival Campaign'}</h1>
              <div className="campaign-context-meta">
                <span className={`campaign-pill ${campaignTone(activeCampaign?.status || 'draft')}`}>
                  {humanize(activeCampaign?.status || 'draft')}
                </span>
                <span>{humanize(activeCampaign?.channel || form.channel)}</span>
              </div>
            </div>
            <div className="campaign-context-actions">
              <Button variant="primary" onClick={handleSaveDraft} loading={working}>
                Save Draft
              </Button>
              <Button variant="outline" onClick={handleRefreshDrafts} disabled={working}>
                Refresh Drafts
              </Button>
              <Button variant="outline" onClick={handleOptimize} disabled={working}>
                AI Optimize
              </Button>
              <Button variant="outline" onClick={handleApproveCampaign} disabled={working}>
                Approve Campaign
              </Button>
              {activeCampaign ? (
                <Button variant="ghost" onClick={() => navigate(`/revival/campaigns/${activeCampaign.id}`)}>
                  Open Tracking
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="campaign-context-stats">
          <MetricBlock label="Recipients" value={headerStats.recipients} />
          <MetricBlock label="Sent" value={headerStats.sent} />
          <MetricBlock label="Failed" value={headerStats.failed} />
          <MetricBlock label="Queued" value={headerStats.queued} />
        </div>
      </section>

      <div className="campaign-workspace-grid">
        <aside className="campaign-left-rail">
          <section className="campaign-section-card">
            <div className="section-head">
              <div>
                <h2>Existing Campaigns</h2>
                <p>Load a campaign into the workspace or jump to detail analytics.</p>
              </div>
              <Button variant="outline" onClick={handleResetWorkspace} disabled={working}>
                New Draft
              </Button>
            </div>
            <div className="campaign-list-scroll">
              {campaigns.length ? (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`campaign-list-card ${text(activeCampaignId) === text(campaign.id) ? 'is-active' : ''}`}
                  >
                    <button type="button" className="campaign-list-card-body" onClick={() => handleLoadCampaign(campaign)}>
                      <strong>{campaign.name}</strong>
                      <p>{humanize(campaign.channel)} · {campaign.total_targets ?? campaign.total ?? 0} recipients</p>
                      <p>Sent {campaign.sent ?? 0} | Failed {campaign.failed ?? 0}</p>
                      <span className={`campaign-pill ${campaignTone(campaign.status)}`}>
                        {humanize(campaign.status)}
                      </span>
                    </button>
                    <div className="campaign-card-actions">
                      <Button variant="ghost" size="sm" onClick={() => handleLoadCampaign(campaign)}>
                        Open Workspace
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/revival/campaigns/${campaign.id}`)}>
                        Track
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No campaigns yet.</p>
              )}
            </div>
          </section>

          <section className="campaign-section-card">
            <div className="section-head">
              <div>
                <h2>Recipient Pool</h2>
                <p>Independent scroll, clearer memberships, and a direct view of current campaign recipients.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPoolCollapsed((prev) => !prev)}>
                {poolCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>

            <div className="campaign-pool-toolbar">
              <div className="campaign-tab-row">
                <button
                  type="button"
                  className={`campaign-tab ${poolTab === 'revival' ? 'is-active' : ''}`}
                  onClick={() => setPoolTab('revival')}
                >
                  Revival Pool
                </button>
                <button
                  type="button"
                  className={`campaign-tab ${poolTab === 'campaign' ? 'is-active' : ''}`}
                  onClick={() => setPoolTab('campaign')}
                  disabled={!activeCampaign}
                >
                  Campaign Recipients
                </button>
              </div>

              <input
                className="campaign-search-input"
                value={poolSearch}
                onChange={(event) => setPoolSearch(event.target.value)}
                placeholder={poolTab === 'revival' ? 'Filter the revival pool' : 'Filter current campaign recipients'}
              />

              <label className="campaign-toggle">
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  disabled={poolTab !== 'revival'}
                  onChange={(event) => setOnlyUnassigned(event.target.checked)}
                />
                <span>Only show recipients not in campaigns</span>
              </label>
            </div>

            {!poolCollapsed ? (
              <div className="pool-table-wrap">
                <table className="pool-table">
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>
                        {poolTab === 'revival' ? (
                          <input
                            type="checkbox"
                            checked={
                              filteredPoolRows.length > 0 &&
                              filteredPoolRows.every((row) => selectedQuoteIds.includes(text(row.quote_id)))
                            }
                            onChange={handleToggleVisiblePool}
                          />
                        ) : null}
                      </th>
                      <th>Customer</th>
                      <th>Quote</th>
                      <th>Status</th>
                      <th>Campaigns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPoolRows.length ? (
                      filteredPoolRows.map((row) => {
                        const memberships = row.memberships || [];
                        return (
                          <tr key={`${poolTab}-${row.quote_id || row.recipient_id}`}>
                            <td>
                              {poolTab === 'revival' ? (
                                <input
                                  type="checkbox"
                                  checked={selectedQuoteIds.includes(text(row.quote_id))}
                                  onChange={() => handlePoolToggle(row)}
                                />
                              ) : (
                                <span className="campaign-pill neutral">IN</span>
                              )}
                            </td>
                            <td>
                              <div className="table-primary">{row.customer_name || 'Unknown customer'}</div>
                              <div className="table-subcopy">{row.address || row.phone || 'No address available'}</div>
                            </td>
                            <td>{formatCurrency(row.quote_total)}</td>
                            <td>
                              <span className={`campaign-pill ${campaignTone(row.quote_status || row.status)}`}>
                                {humanize(row.quote_status || row.status)}
                              </span>
                            </td>
                            <td>
                              <MembershipBadges memberships={memberships} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state-row">
                          <p className="empty-state">
                            {poolTab === 'campaign'
                              ? 'Load a campaign to see who is already attached.'
                              : 'No recipient pool rows matched that filter.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </aside>

        <main className="campaign-center-column">
          <section className="campaign-section-card">
            <div className="section-head">
              <div>
                <h2>Campaign Builder</h2>
                <p>Existing campaign context stays locked while you add recipients, revise copy, or refresh drafts.</p>
              </div>
            </div>

            <div className="campaign-form-grid">
              <label className="campaign-field">
                <span>Campaign Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Revival follow-up"
                />
              </label>

              <label className="campaign-field">
                <span>Channel</span>
                <select
                  value={form.channel}
                  onChange={(event) => setForm((prev) => ({ ...prev, channel: event.target.value }))}
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>

              <label className="campaign-field campaign-field-full">
                <span>Description</span>
                <input
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="What this campaign is meant to do"
                />
              </label>

              <label className="campaign-field campaign-field-full">
                <span>Base Message</span>
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Write the template message once, then review the generated drafts below."
                />
              </label>

              <label className="campaign-field">
                <span>AI Goal</span>
                <input
                  value={form.goal}
                  onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
                  placeholder="Get replies, recover quotes, book work"
                />
              </label>

              <label className="campaign-field">
                <span>MMS Media URLs</span>
                <textarea
                  value={form.mediaUrlsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, mediaUrlsText: event.target.value }))}
                  placeholder="Paste one image URL per line"
                />
              </label>
            </div>

            <div className="campaign-builder-footer">
              <div>
                <strong>{selectedQuoteRows.length}</strong> selected from the revival pool
              </div>
              <Button variant="outline" onClick={() => setSelectedQuoteIds([])} disabled={!selectedQuoteRows.length}>
                Clear Selected
              </Button>
            </div>
          </section>

          <section className="campaign-section-card">
            <div className="section-head">
              <div>
                <h2>Review / Send Workspace</h2>
                <p>Improved scan order, clearer columns, and campaign badges on every row.</p>
              </div>
              <div className="thread-actions">
                <Button variant="outline" onClick={handleToggleQueuedRows} disabled={!sendableRows.length}>
                  {sendableRows.length && sendableRows.every((row) => selectedReviewIds.includes(row.recipient_id))
                    ? 'Clear Queued'
                    : 'Select Queued'}
                </Button>
                <Button variant="outline" onClick={handleSendAllQueued} disabled={!sendableRows.length || working}>
                  Send All Queued
                </Button>
                <Button variant="primary" onClick={handleSendSelected} disabled={!selectedReviewIds.length || working}>
                  Send Selected
                </Button>
              </div>
            </div>

            <div className="review-summary">
              <MetricBlock label="Campaign Recipients" value={workspaceRows.length} />
              <MetricBlock label="Ready To Send" value={summary.ready || 0} />
              <MetricBlock label="Replies" value={summary.replies || 0} />
            </div>

            <div className="review-table-wrap">
              <table className="review-table campaign-review-table">
                <colgroup>
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '240px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '420px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '220px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Send</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Message</th>
                    <th>Quote</th>
                    <th>Status</th>
                    <th>Last Reply</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceRows.length ? (
                    workspaceRows.map((row) => {
                      const message = resolveRowMessage(row, draftsById, form.message);
                      const sendable = isSendableRow(row, message);
                      return (
                        <tr key={row.recipient_id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedReviewIds.includes(row.recipient_id)}
                              disabled={!sendable}
                              onChange={() => handleReviewToggle(row.recipient_id)}
                            />
                          </td>
                          <td>
                            <div className="table-primary">{row.customer_name}</div>
                            <div className="campaign-inline-meta">
                              <span className="campaign-pill info">{row.campaign_name}</span>
                            </div>
                            <div className="table-subcopy">{row.address || 'Address unavailable'}</div>
                          </td>
                          <td>{row.phone || 'No phone'}</td>
                          <td>
                            <textarea
                              className="review-editor review-message-editor"
                              value={message}
                              disabled={!sendable}
                              onChange={(event) =>
                                setDraftsById((prev) => ({
                                  ...prev,
                                  [row.recipient_id]: event.target.value,
                                }))
                              }
                            />
                          </td>
                          <td>{formatCurrency(row.quote_total)}</td>
                          <td>
                            <span className={`campaign-pill ${campaignTone(row.status)}`}>{humanize(row.status)}</span>
                            <div className="table-subcopy">{row.sent_at ? formatDate(row.sent_at) : 'Not sent yet'}</div>
                          </td>
                          <td>
                            <div className="reply-preview" title={row.reply || row.error_message || ''}>
                              {row.reply || row.error_message || row.skip_reason || 'No reply yet'}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="empty-state-row">
                        <p className="empty-state">
                          {reviewLoading
                            ? 'Loading campaign review rows...'
                            : 'Load or create a campaign to review recipients here.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside className="campaign-right-rail">
          <section className="campaign-section-card">
            <div className="section-head">
              <div>
                <h2>Campaign Snapshot</h2>
                <p>Quick operator view of the active workspace.</p>
              </div>
            </div>
            <div className="snapshot-grid">
              <MetricBlock label="Eligible Pool" value={eligibleRows.length} />
              <MetricBlock label="Selected" value={selectedQuoteRows.length} />
              <MetricBlock label="Campaign Recipients" value={workspaceRows.length} />
              <MetricBlock label="Ready To Send" value={summary.ready || 0} />
            </div>
          </section>

          <section className="campaign-section-card">
            <div className="section-head">
              <div>
                <h2>Campaign Activity</h2>
                <p>Replies, failures, and recent sends stay visible without leaving the workspace.</p>
              </div>
            </div>

            <div className="activity-group">
              <h3>Recent Replies</h3>
              {recentReplies.length ? (
                recentReplies.map((row) => (
                  <div key={`reply-${row.recipient_id}`} className="activity-row">
                    <strong>{row.customer_name}</strong>
                    <p>{row.reply}</p>
                  </div>
                ))
              ) : (
                <p className="empty-state">No replies yet.</p>
              )}
            </div>

            <div className="activity-group">
              <h3>Failures</h3>
              {recentFailures.length ? (
                recentFailures.map((row) => (
                  <div key={`fail-${row.recipient_id}`} className="activity-row">
                    <strong>{row.customer_name}</strong>
                    <p>{row.error_message || 'Delivery failed'}</p>
                  </div>
                ))
              ) : (
                <p className="empty-state">No failures recorded.</p>
              )}
            </div>

            <div className="activity-group">
              <h3>Send History</h3>
              {sendHistory.length ? (
                sendHistory.map((row) => (
                  <div key={`history-${row.recipient_id}`} className="activity-row">
                    <strong>{row.customer_name}</strong>
                    <p>{formatDate(row.sent_at)}</p>
                  </div>
                ))
              ) : (
                <p className="empty-state">No sends recorded yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
