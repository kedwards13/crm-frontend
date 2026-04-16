import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerPopup from '../Profile/CustomerPopup';
import FiltersBar from '../Layout/FiltersBar';
import { getIndustry } from '../../utils/tenantHelpers';
import { normalizeIndustry } from '../../helpers/tenantHelpers';
import { getPipelineConfig } from '../../constants/pipelineRegistry';
import { getIndustryCopy } from '../../constants/industryCopy';
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from '../../constants/pipelineStages';
import { archiveCrmLead, getLeadPipeline, spamCrmLead, updateLeadStage, updateCrmLead } from '../../api/leadsApi';
import { normalizeLead } from '../../utils/normalizeLead';
import './Pipeline.css';

function useDebounced(value, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

const STAGE_PAGE_SIZE = 20;
const INITIAL_STAGE_WINDOW = 40;
const MAX_STAGE_RENDER = 150;

const STAGE_SHORT_LABELS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  ESTIMATE_SCHEDULED: 'Scheduled',
  ESTIMATE_SENT: 'Estimate',
  FOLLOW_UP: 'Follow Up',
  BOOKED: 'Booked',
  LOST: 'Lost',
};

const LOST_REASON_OPTIONS = [
  { value: 'no_response', label: 'No Response' },
  { value: 'budget', label: 'Budget / Price' },
  { value: 'competitor', label: 'Went with Competitor' },
  { value: 'timing', label: 'Bad Timing' },
  { value: 'not_qualified', label: 'Not Qualified' },
  { value: 'duplicate', label: 'Duplicate Lead' },
  { value: 'spam', label: 'Spam / Fake' },
  { value: 'other', label: 'Other' },
];

const COLUMN_ORDER = PIPELINE_STAGES.map((stage) => ({
  key: stage,
  label: PIPELINE_STAGE_LABELS[stage],
}));

const flattenPipelineResponse = (value) => {
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap((rows) => (Array.isArray(rows) ? rows : []));
};

const clean = (value) => String(value || '').trim();

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'N/A';
  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

const previewMessage = (value) => {
  const text = clean(value);
  if (text.length <= 140) return text;
  return `${text.slice(0, 137)}...`;
};

const resolveMessage = (lead) =>
  clean(
    lead?.message ||
      lead?.notes ||
      lead?.attributes?.notes ||
      lead?.intake_attributes?.notes
  );

const detectSource = (lead) => {
  const markers = [
    clean(lead.source),
    clean(lead.sourceLabel),
    clean(lead.attributes?.source),
    clean(lead.intake_attributes?.source),
    clean(lead.source_table),
    clean(lead.source_host),
    clean(lead.lifecycle_state),
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean)
    .join(' ');

  if (markers.includes('scan') || markers.includes('scanner') || markers.includes('ocr')) return 'Scanner';
  if (markers.includes('revival')) return 'Revival';
  if (markers.includes('voice') || markers.includes('call')) return 'Voice';
  if (markers.includes('sms') || markers.includes('message') || markers.includes('text')) return 'SMS';
  if (markers.includes('web') || markers.includes('forms_generic')) return 'Web';
  return 'CRM';
};

const isScannerLead = (lead) => {
  const sourceLabel = detectSource(lead);
  return sourceLabel === 'Scanner' || sourceLabel === 'Revival';
};

const resolveQuoteValue = (lead) =>
  formatCurrency(
    lead?.quote_total ??
      lead?.estimated_total ??
      lead?.attributes?.estimated_total ??
      lead?.intake_attributes?.estimated_total ??
      lead?.intake_attributes?.quote_total ??
      0
  );

const resolveServiceLabel = (lead) =>
  clean(
    lead?.serviceLabel ||
      lead?.service ||
      lead?.service_type ||
      lead?.industry_role ||
      lead?.attributes?.service ||
      lead?.attributes?.service_type ||
      lead?.intake_attributes?.service ||
      lead?.intake_attributes?.service_type
  );

const getPrimaryAction = (stage, hasCustomer) => {
  switch (stage) {
    case 'NEW':
      return { label: 'Contact', nextStage: 'CONTACTED' };
    case 'CONTACTED':
      return { label: 'Qualify', nextStage: 'QUALIFIED' };
    case 'QUALIFIED':
      return { label: 'Schedule Estimate', nextStage: 'ESTIMATE_SCHEDULED' };
    case 'ESTIMATE_SCHEDULED':
      return { label: 'Open Schedule', route: 'schedule' };
    case 'ESTIMATE_SENT':
      return { label: 'Follow Up', nextStage: 'FOLLOW_UP' };
    case 'FOLLOW_UP':
      return { label: 'Book Job', nextStage: 'BOOKED' };
    case 'BOOKED':
      return hasCustomer ? { label: 'View Customer', route: 'customer' } : { label: 'Open Lead', route: 'lead' };
    case 'LOST':
      return { label: 'Open Lead', route: 'lead' };
    default:
      return { label: 'Open Lead', route: 'lead' };
  }
};

const normalizePipelineRows = (rows) => {
  const byId = new Map();

  rows
    .map((row) => normalizeLead(row))
    .filter((lead) => !lead.isArchived && !isScannerLead(lead))
    .forEach((lead) => {
      const leadId = clean(lead.id);
      if (!leadId) return;
      const existing = byId.get(leadId);
      if (!existing) {
        byId.set(leadId, lead);
        return;
      }

      const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
      const nextTime = new Date(lead.updated_at || lead.created_at || 0).getTime();
      if (nextTime >= existingTime) {
        byId.set(leadId, lead);
      }
    });

  return Array.from(byId.values());
};

const updateLeadLocally = (rows, leadId, changes) =>
  rows.map((lead) =>
    String(lead.id) === String(leadId)
      ? {
          ...lead,
          ...changes,
        }
      : lead
  );

const bucketByStage = (leads) => {
  const buckets = {};
  COLUMN_ORDER.forEach((stage) => {
    buckets[stage.key] = [];
  });

  leads.forEach((lead) => {
    const stage = lead.safePipelineStage || lead.pipeline_stage || 'NEW';
    if (buckets[stage]) {
      buckets[stage].push(lead);
    }
  });

  return buckets;
};

export default function PipelineView() {
  const navigate = useNavigate();
  const industry = normalizeIndustry(getIndustry?.() || 'general');
  const config = getPipelineConfig(industry);
  const copy = getIndustryCopy(industry);
  const stageRefs = useRef({});
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLead, setActiveLead] = useState(null);
  const [movingLeadId, setMovingLeadId] = useState(null);
  const [movingAction, setMovingAction] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dropStage, setDropStage] = useState('');
  const [focusedStage, setFocusedStage] = useState('NEW');
  const [openMenuLeadId, setOpenMenuLeadId] = useState(null);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [visibleByStage, setVisibleByStage] = useState({});
  const [pendingLostLeadId, setPendingLostLeadId] = useState(null);
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const searchRef = useRef(null);
  const debouncedQuery = useDebounced(q, 250);

  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenMenuLeadId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getLeadPipeline();
      const rows = normalizePipelineRows(flattenPipelineResponse(response.data));
      setAllLeads(rows);
    } catch (nextError) {
      setError(String(nextError?.message || nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const valueOf = useCallback(
    (lead) => {
      if (!config.valueField) return 0;
      const value = Number(lead?.[config.valueField]);
      return Number.isFinite(value) ? value : 0;
    },
    [config.valueField]
  );

  const filteredLeads = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    const rows = allLeads.filter((lead) => {
      if (lead.isArchived) return false;
      if (!needle) return true;

      const fields = [
        lead.displayName,
        lead.displayEmail,
        lead.displayPhone,
        lead.serviceLabel || lead.service,
        lead.message,
        lead.address,
        lead.source_host,
      ]
        .map((value) => clean(value).toLowerCase())
        .filter(Boolean);

      return fields.some((value) => value.includes(needle));
    });

    return [...rows].sort((left, right) => {
      if (sortBy === 'updated_asc') {
        return new Date(left.updated_at || left.created_at || 0) - new Date(right.updated_at || right.created_at || 0);
      }
      if (sortBy === 'value_desc') return valueOf(right) - valueOf(left);
      if (sortBy === 'value_asc') return valueOf(left) - valueOf(right);
      return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0);
    });
  }, [allLeads, debouncedQuery, sortBy, valueOf]);

  const buckets = useMemo(() => bucketByStage(filteredLeads), [filteredLeads]);

  const counts = useMemo(
    () =>
      COLUMN_ORDER.reduce(
        (acc, stage) => ({
          ...acc,
          [stage.key]: buckets[stage.key]?.length || 0,
        }),
        {}
      ),
    [buckets]
  );

  const ensureVisibleWindow = useCallback((stageKey) => {
    setVisibleByStage((current) => {
      if (current[stageKey]) return current;
      return { ...current, [stageKey]: INITIAL_STAGE_WINDOW };
    });
  }, []);

  useEffect(() => {
    COLUMN_ORDER.forEach((stage) => ensureVisibleWindow(stage.key));
  }, [ensureVisibleWindow]);

  const scrollToStage = useCallback((stageKey) => {
    const node = stageRefs.current?.[stageKey];
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
    setFocusedStage(stageKey);
  }, []);

  const moveLeadToStage = useCallback(
    async (leadId, nextStage, extraFields = {}) => {
      const id = clean(leadId);
      if (!id || !nextStage) return;

      const currentLead = allLeads.find((lead) => String(lead.id) === id);
      const currentStage = currentLead?.safePipelineStage || currentLead?.pipeline_stage || 'NEW';
      if (currentStage === nextStage) return;

      // Intercept LOST — show modal to capture reason
      if (nextStage === 'LOST' && !extraFields._confirmedLost) {
        setPendingLostLeadId(id);
        setLostReason('');
        setLostNotes('');
        setDraggedLeadId(null);
        setDropStage('');
        return;
      }

      const snapshot = allLeads;
      setMovingLeadId(id);
      setMovingAction('stage');
      setOpenMenuLeadId(null);
      setError('');
      setAllLeads((rows) =>
        updateLeadLocally(rows, id, {
          pipeline_stage: nextStage,
          safePipelineStage: nextStage,
          pipelineStageLabel: PIPELINE_STAGE_LABELS[nextStage] || nextStage,
          updated_at: new Date().toISOString(),
        })
      );
      setFocusedStage(nextStage);

      try {
        const { _confirmedLost, ...apiFields } = extraFields;
        const response = await updateLeadStage(id, nextStage, apiFields);
        const nextLead = response?.data ? normalizeLead(response.data) : null;
        if (nextLead?.id) {
          setAllLeads((rows) => updateLeadLocally(rows, id, nextLead));
        }
      } catch (nextError) {
        setAllLeads(snapshot);
        setError(String(nextError?.message || nextError));
      } finally {
        setMovingLeadId(null);
        setMovingAction('');
        setDraggedLeadId(null);
        setDropStage('');
      }
    },
    [allLeads]
  );

  const archiveLead = useCallback(
    async (lead, spam = false) => {
      const leadId = clean(lead?.id);
      if (!leadId) return;

      const snapshot = allLeads;
      setMovingLeadId(leadId);
      setMovingAction(spam ? 'spam' : 'archive');
      setOpenMenuLeadId(null);
      setError('');
      setAllLeads((rows) => rows.filter((row) => String(row.id) !== leadId));

      try {
        if (spam) {
          await spamCrmLead(leadId, lead?.attributes || {});
        } else {
          await archiveCrmLead(leadId);
        }
      } catch (nextError) {
        setAllLeads(snapshot);
        setError(String(nextError?.message || nextError));
      } finally {
        setMovingLeadId(null);
        setMovingAction('');
      }
    },
    [allLeads]
  );

  const showMoreForStage = useCallback((stageKey) => {
    setVisibleByStage((current) => {
      const nextValue = Math.min((current[stageKey] || INITIAL_STAGE_WINDOW) + STAGE_PAGE_SIZE, MAX_STAGE_RENDER);
      if (nextValue === current[stageKey]) return current;
      return { ...current, [stageKey]: nextValue };
    });
  }, []);

  const handleStageScroll = useCallback(
    (stageKey, event) => {
      const element = event.currentTarget;
      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (remaining < 140) {
        showMoreForStage(stageKey);
      }
    },
    [showMoreForStage]
  );

  return (
    <div className="pipeline-page content-area">
      <FiltersBar
        left={<span className="pl-toolbar-note">Active CRM leads only</span>}
        center={
          <input
            ref={searchRef}
            className="filters-input"
            placeholder="Search name, phone, service, source, address..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        }
        right={
          <select className="filters-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="updated_desc">Updated: Newest</option>
            <option value="updated_asc">Updated: Oldest</option>
            <option value="value_desc">Value: High - Low</option>
            <option value="value_asc">Value: Low - High</option>
          </select>
        }
      />

      <div className="pipeline container">
        <div className="pipeline-header">
          <div className="pipeline-header-copy">
            <h1>{copy.pipelineTitle}</h1>
            <p className="pl-subtitle">Website leads stay in Web Queue, scanner leads stay in Revival, and only active CRM leads appear here.</p>
          </div>
        </div>

        <div className="pl-workflow">
          <span className="pl-workflow-label">Lead Workflow</span>
          <span className="pl-workflow-track">
            NEW → CONTACT → QUALIFY → SCHEDULE → ESTIMATE → FOLLOW UP → BOOK
          </span>
        </div>

        <div className="pl-ribbon" role="tablist" aria-label="Pipeline stages">
          {COLUMN_ORDER.map((stage) => {
            const active = focusedStage === stage.key || dropStage === stage.key;
            return (
              <button
                key={stage.key}
                type="button"
                className={`pl-ribbon-pill ${active ? 'is-active' : ''}`}
                onClick={() => scrollToStage(stage.key)}
              >
                <span>{stage.label}</span>
                <span className="pl-ribbon-count">{counts[stage.key] || 0}</span>
              </button>
            );
          })}
        </div>

        {loading && <p className="pl-loading">Loading pipeline...</p>}
        {error && <p className="pl-error">{error}</p>}

        {!loading && !error && (
          <div className="pl-board" role="list">
            {COLUMN_ORDER.map((stage) => {
              const data = buckets[stage.key] || [];
              const visibleCount = Math.min(visibleByStage[stage.key] || INITIAL_STAGE_WINDOW, MAX_STAGE_RENDER);
              const visibleRows = data.slice(0, visibleCount);
              const canMore = data.length > visibleRows.length && visibleCount < MAX_STAGE_RENDER;

              return (
                <section
                  key={stage.key}
                  className={`pl-column ${dropStage === stage.key ? 'drop-target' : ''}`}
                  ref={(node) => {
                    stageRefs.current[stage.key] = node;
                  }}
                  onDragOver={(event) => {
                    if (!draggedLeadId) return;
                    event.preventDefault();
                    if (dropStage !== stage.key) setDropStage(stage.key);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const leadId = event.dataTransfer.getData('text/plain') || draggedLeadId;
                    if (!leadId) return;
                    void moveLeadToStage(leadId, stage.key);
                  }}
                >
                  <header className="pl-column-header">
                    <div>
                      <p className="pl-column-label">{stage.label}</p>
                      <p className="pl-column-meta">{data.length} leads</p>
                    </div>
                    <span className="pl-column-count">{data.length}</span>
                  </header>

                  <div className="pl-column-body" onScroll={(event) => handleStageScroll(stage.key, event)}>
                    {visibleRows.length === 0 ? (
                      <p className="pl-empty">{config.emptyCopy}</p>
                    ) : (
                      visibleRows.map((lead) => {
                        const leadId = clean(lead.id);
                        const phone = clean(lead.displayPhone || lead.phone_number || lead.primary_phone);
                        const email = clean(lead.displayEmail || lead.email || lead.primary_email);
                        const sourceLabel = detectSource(lead);
                        const serviceLabel = resolveServiceLabel(lead);
                        const phoneLabel = phone || 'N/A';
                        const quoteValue = resolveQuoteValue(lead);
                        const fullMessage = resolveMessage(lead);
                        const messagePreview = previewMessage(fullMessage);
                        const hasLongMessage = fullMessage.length > 140;
                        const matchedCustomerId = clean(
                          lead.matched_customer_id || lead.matched_customer?.id || lead.matched_customer
                        );
                        const primaryAction = getPrimaryAction(stage.key, Boolean(matchedCustomerId));
                        const isBusy = movingLeadId === leadId;

                        const openLead = () => setActiveLead(lead);
                        const openCustomer = () => {
                          if (matchedCustomerId) {
                            navigate(`/customers/${matchedCustomerId}`);
                            return;
                          }
                          openLead();
                        };
                        const openSchedule = () => navigate(`/schedule?lead_id=${encodeURIComponent(leadId)}`);
                        const openEstimate = () => navigate(`/revival/overview?lead_id=${encodeURIComponent(leadId)}`);
                        const dialLead = () => {
                          if (phone) window.location.href = `tel:${phone}`;
                        };
                        const textLead = () => {
                          if (phone) window.location.href = `sms:${phone}`;
                        };

                        const runPrimaryAction = async () => {
                          if (primaryAction.nextStage) {
                            await moveLeadToStage(leadId, primaryAction.nextStage);
                            if (primaryAction.nextStage === 'ESTIMATE_SCHEDULED') {
                              openSchedule();
                            }
                            return;
                          }
                          if (primaryAction.route === 'schedule') {
                            openSchedule();
                            return;
                          }
                          if (primaryAction.route === 'customer') {
                            openCustomer();
                            return;
                          }
                          openLead();
                        };

                        return (
                          <article key={leadId} className="pl-card" role="listitem" onClick={openLead}>
                            <div className="pl-card-header">
                              <div className="pl-card-badges">
                                <span className="pl-chip pl-chip-source">{sourceLabel}</span>
                              </div>
                              <div className="pl-card-tools" onClick={(event) => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="pl-card-icon"
                                  draggable={!isBusy}
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData('text/plain', leadId);
                                    setDraggedLeadId(leadId);
                                    setFocusedStage(stage.key);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedLeadId(null);
                                    setDropStage('');
                                  }}
                                  aria-label={`Drag ${lead.displayName || lead.name || 'lead'}`}
                                  title="Drag to move"
                                >
                                  ⋮⋮
                                </button>
                                <button
                                  type="button"
                                  className="pl-card-icon"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenMenuLeadId((current) => (current === leadId ? null : leadId));
                                  }}
                                  aria-label="More lead actions"
                                >
                                  •••
                                </button>
                                {openMenuLeadId === leadId ? (
                                  <div className="pl-overflow-menu">
                                    {matchedCustomerId ? (
                                      <button type="button" onClick={openCustomer}>
                                        Customer
                                      </button>
                                    ) : null}
                                    {phone ? (
                                      <button type="button" onClick={dialLead}>
                                        Call
                                      </button>
                                    ) : null}
                                    <button type="button" onClick={openEstimate}>
                                      Revival
                                    </button>
                                    {primaryAction.nextStage ? (
                                      <button type="button" onClick={() => void moveLeadToStage(leadId, primaryAction.nextStage)} disabled={isBusy}>
                                        {isBusy && movingAction === 'stage'
                                          ? 'Updating...'
                                          : `Move to ${PIPELINE_STAGE_LABELS[primaryAction.nextStage]}`}
                                      </button>
                                    ) : null}
                                    <button type="button" onClick={() => void archiveLead(lead, false)} disabled={isBusy}>
                                      Archive
                                    </button>
                                    <button type="button" onClick={() => void archiveLead(lead, true)} disabled={isBusy}>
                                      Spam
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <strong className="pl-name">{lead.displayName || lead.name || 'Unnamed lead'}</strong>
                            <p className="pl-contact">Phone: {phoneLabel}</p>
                            <p className="pl-service">Source: {sourceLabel}</p>
                            <p className="pl-service">Service: {serviceLabel || 'General'}</p>
                            <p className="pl-updated">Quote value: {quoteValue}</p>
                            {messagePreview ? (
                              <div
                                className={`pl-message-wrap ${hasLongMessage ? 'is-expandable' : ''}`}
                                tabIndex={hasLongMessage ? 0 : undefined}
                              >
                                <p className="pl-message">{messagePreview}</p>
                                {hasLongMessage ? (
                                  <div className="pl-message-popover">
                                    <strong>Full message</strong>
                                    <span>{fullMessage}</span>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            <button
                              type="button"
                              className="pl-primary-action"
                              disabled={isBusy}
                              onClick={(event) => {
                                event.stopPropagation();
                                void runPrimaryAction();
                              }}
                            >
                              {isBusy && movingAction === 'stage'
                                ? 'Updating...'
                                : primaryAction.nextStage
                                  ? `Move → ${STAGE_SHORT_LABELS[primaryAction.nextStage] || PIPELINE_STAGE_LABELS[primaryAction.nextStage]}`
                                  : primaryAction.label}
                            </button>

                            <div className="pl-actions" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="pl-action" onClick={openLead}>
                                Open
                              </button>
                              <button type="button" className="pl-action" onClick={textLead} disabled={!phone && !email}>
                                Message
                              </button>
                              <button type="button" className="pl-action" onClick={openSchedule}>
                                Schedule
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}

                    {canMore ? (
                      <button type="button" className="pl-more" onClick={() => showMoreForStage(stage.key)}>
                        Show more
                      </button>
                    ) : null}
                    {data.length > MAX_STAGE_RENDER ? (
                      <p className="pl-cap-note">Showing first {visibleRows.length} of {data.length} leads.</p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {activeLead ? (
        <CustomerPopup
          lead={activeLead}
          leadType="pipeline"
          onClose={() => setActiveLead(null)}
        />
      ) : null}

      {/* Lost Reason Modal */}
      {pendingLostLeadId && (
        <div className="pl-lost-overlay" onClick={() => setPendingLostLeadId(null)}>
          <div className="pl-lost-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pl-lost-title">Why was this lead lost?</h3>
            <div className="pl-lost-field">
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="pl-lost-select"
              >
                <option value="">Select a reason...</option>
                {LOST_REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="pl-lost-field">
              <textarea
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                className="pl-lost-textarea"
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>
            <div className="pl-lost-actions">
              <button
                className="pl-lost-cancel"
                onClick={() => setPendingLostLeadId(null)}
              >
                Cancel
              </button>
              <button
                className="pl-lost-confirm"
                disabled={!lostReason}
                onClick={() => {
                  const id = pendingLostLeadId;
                  setPendingLostLeadId(null);
                  void moveLeadToStage(id, 'LOST', {
                    _confirmedLost: true,
                    lost_reason: lostReason,
                    lost_notes: lostNotes,
                  });
                }}
              >
                Mark as Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
