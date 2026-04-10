import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock3, Mail, Phone } from 'lucide-react';
import LeadsList from './LeadsList';
import FiltersBar from '../Layout/FiltersBar';
import { AuthContext } from '../../App';
import CustomerPopup from '../Profile/CustomerPopup';
import { getIndustry } from '../../helpers/tenantHelpers';
import {
  listCrmLeads,
  listWebLeads,
  archiveWebLead,
  spamWebLead,
  transferLead,
} from '../../api/leadsApi';
import {
  PIPELINE_STAGE_BOOKED,
  PIPELINE_STAGE_CONTACTED,
  PIPELINE_STAGE_ESTIMATE_SCHEDULED,
  PIPELINE_STAGE_ESTIMATE_SENT,
  PIPELINE_STAGE_FOLLOW_UP,
  PIPELINE_STAGE_LOST,
  PIPELINE_STAGE_QUALIFIED,
  getPipelineStageLabel,
} from '../../constants/pipelineStages';
import { normalizeLead } from '../../utils/normalizeLead';
import { getIndustryCopy } from '../../constants/industryCopy';
import ActionButton from '../ui/ActionButton';
import SearchInput from '../ui/SearchInput';
import './LeadsPage.css';

function useDebouncedValue(value, delayMs = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return v;
}

function compactDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function previewMessage(message) {
  const text = String(message || '').trim();
  if (text.length <= 145) return text;
  return `${text.slice(0, 142)}...`;
}

function getFullMessage(lead) {
  return String(
    lead.message ||
      lead.notes ||
      lead.attributes?.notes ||
      lead.intake_attributes?.notes ||
      ''
  ).trim();
}

const LEGACY_ROUTE_STAGE_MAP = {
  contacted: [PIPELINE_STAGE_CONTACTED],
  qualified: [PIPELINE_STAGE_QUALIFIED],
  scheduled: [PIPELINE_STAGE_ESTIMATE_SCHEDULED],
  'estimate-scheduled': [PIPELINE_STAGE_ESTIMATE_SCHEDULED],
  estimate_scheduled: [PIPELINE_STAGE_ESTIMATE_SCHEDULED],
  'estimate-sent': [PIPELINE_STAGE_ESTIMATE_SENT],
  estimate_sent: [PIPELINE_STAGE_ESTIMATE_SENT],
  'follow-up': [PIPELINE_STAGE_FOLLOW_UP],
  follow_up: [PIPELINE_STAGE_FOLLOW_UP],
  waiting: [PIPELINE_STAGE_FOLLOW_UP],
  booked: [PIPELINE_STAGE_BOOKED],
  closed: [PIPELINE_STAGE_BOOKED],
  won: [PIPELINE_STAGE_BOOKED],
  dead: [PIPELINE_STAGE_LOST],
  lost: [PIPELINE_STAGE_LOST],
  rejected: [PIPELINE_STAGE_LOST],
};

const HISTORICAL_PIPELINE_STAGES = new Set([PIPELINE_STAGE_BOOKED, PIPELINE_STAGE_LOST]);

function WebLeadCard({ lead, selected = false, view = 'grid', onToggle, onAdd, onArchive, onSpam, onOpen }) {
  const name = lead.displayName || lead.name || 'Unknown Lead';
  const phone = lead.displayPhone || lead.phone_number || lead.primary_phone || 'N/A';
  const email = lead.displayEmail || lead.email || lead.primary_email || 'N/A';
  const service = lead.serviceLabel || lead.service || lead.service_type || 'General inquiry';
  const source = lead.lead_source || lead.source_host || 'Unknown source';
  const fullMessage = getFullMessage(lead);
  const message = previewMessage(fullMessage);
  const hasLongMessage = fullMessage.length > 145;
  const isSelectable = lead.id != null;

  return (
    <article
      className={`lead-intake-card ${view === 'list' ? 'is-list' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={() => onOpen?.(lead)}
      role='button'
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen?.(lead);
      }}
    >
      {isSelectable ? (
        <label
          className='lead-select'
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${name}`}
        >
          <input type='checkbox' checked={selected} onChange={() => onToggle?.(lead.id)} />
        </label>
      ) : null}

      <div className='lead-intake-head'>
        <h3>{name}</h3>
        <span>{source}</span>
      </div>

      <div className='lead-intake-grid'>
        <p>
          <Phone size={13} />
          <span>{phone}</span>
        </p>
        <p>
          <Mail size={13} />
          <span>{email}</span>
        </p>
        <p className='lead-intake-service'>{service}</p>
        <p>
          <Clock3 size={13} />
          <span>{compactDate(lead.created_at)}</span>
        </p>
      </div>

      <div
        className={`lead-intake-message-wrap ${hasLongMessage ? 'is-expandable' : ''}`}
        tabIndex={hasLongMessage ? 0 : undefined}
      >
        <p className='lead-intake-message'>{message || 'No message preview available.'}</p>
        {hasLongMessage ? (
          <div className='lead-intake-message-popover'>
            <strong>Full message</strong>
            <span>{fullMessage}</span>
          </div>
        ) : null}
      </div>

      <div className='lead-intake-actions' onClick={(event) => event.stopPropagation()}>
        <ActionButton variant='primary' size='sm' onClick={() => onAdd?.(lead)}>
          Add to Pipeline
        </ActionButton>
        <ActionButton variant='secondary' size='sm' onClick={() => onArchive?.(lead)}>
          Archive
        </ActionButton>
        <ActionButton variant='danger' size='sm' onClick={() => onSpam?.(lead)}>
          Spam
        </ActionButton>
      </div>
    </article>
  );
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token } = useContext(AuthContext);
  const industry = getIndustry('general');
  const copy = getIndustryCopy(industry);

  const [inboxLeads, setInboxLeads] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [errorInbox, setErrorInbox] = useState('');
  const [crmLeads, setCrmLeads] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [errorCrm, setErrorCrm] = useState('');

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeLead, setActiveLead] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 250);
  const didRef = useRef(false);
  const didSyncCrmRouteRef = useRef(false);

  const subPath = useMemo(() => {
    const trimmed = location.pathname.replace(/^\/leads\/?/, '');
    return trimmed.split('/')[0];
  }, [location.pathname]);

  const isWebView = !subPath || subPath === 'intake' || subPath === 'new';
  const crmStageFilters = useMemo(() => {
    if (isWebView || !subPath) return [];
    return LEGACY_ROUTE_STAGE_MAP[subPath] || [];
  }, [isWebView, subPath]);
  const includeArchivedCrm = useMemo(
    () => crmStageFilters.some((stage) => HISTORICAL_PIPELINE_STAGES.has(stage)),
    [crmStageFilters]
  );

  const loadInboxLeads = useCallback(async () => {
    setLoadingInbox(true);
    setErrorInbox('');
    try {
      const res = await listWebLeads();
      const rows = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setInboxLeads(rows.map(normalizeLead));
    } catch (error) {
      setErrorInbox(error?.message || 'Web leads fetch failed');
      setInboxLeads([]);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const loadCrmLeads = useCallback(async () => {
    setLoadingCrm(true);
    setErrorCrm('');
    try {
      const res = await listCrmLeads(includeArchivedCrm ? { archived: 'all' } : {});
      const rows = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setCrmLeads(rows.map(normalizeLead));
    } catch (error) {
      setErrorCrm(error?.message || 'CRM fetch failed');
      setCrmLeads([]);
    } finally {
      setLoadingCrm(false);
    }
  }, [includeArchivedCrm]);

  useEffect(() => {
    if (!isAuthenticated || !token) return navigate('/login');
    if (didRef.current) return;
    didRef.current = true;

    const load = async () => {
      await Promise.all([loadInboxLeads(), loadCrmLeads()]);
    };
    load();
  }, [isAuthenticated, token, navigate, loadInboxLeads, loadCrmLeads]);

  useEffect(() => {
    if (!didRef.current || !isAuthenticated || !token) return;
    if (!didSyncCrmRouteRef.current) {
      didSyncCrmRouteRef.current = true;
      return;
    }
    void loadCrmLeads();
  }, [isAuthenticated, token, loadCrmLeads]);

  useEffect(() => {
    if (!isWebView || sortBy === 'newest') return;
    setSortBy('newest');
  }, [isWebView, sortBy]);

  useEffect(() => {
    if (location.state?.create !== 'lead') return;
    const currentIndustry = getIndustry('general');
    setActiveLead({
      object: 'lead',
      name: '',
      email: '',
      phone_number: '',
      address: '',
      service_type: '',
      lead_source: '',
      notes: '',
      industry: currentIndustry,
      status: 'new',
      attributes: {},
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const filteredLeads = useMemo(() => {
    let rows = Array.isArray(inboxLeads) ? [...inboxLeads] : [];
    const q = debouncedQuery.trim().toLowerCase();

    if (q) {
      rows = rows.filter((row) => {
        const fields = [
          row.displayName,
          row.displayEmail,
          row.displayPhone,
          row.serviceLabel || row.service || row.service_type,
          row.lead_source || row.source_host,
          row.message,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return fields.includes(q);
      });
    }

    if (dateFrom) rows = rows.filter((row) => row.created_at && new Date(row.created_at) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((row) => row.created_at && new Date(row.created_at) <= new Date(dateTo));

    return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [inboxLeads, debouncedQuery, dateFrom, dateTo]);

  const filteredCrmLeads = useMemo(() => {
    let rows = Array.isArray(crmLeads) ? [...crmLeads] : [];

    if (crmStageFilters.length) {
      rows = rows.filter((lead) => crmStageFilters.includes(lead.safePipelineStage));
    } else {
      rows = rows.filter((lead) => !lead.isArchived);
    }

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const fields = [
          row.displayName,
          row.displayEmail,
          row.displayPhone,
          row.serviceLabel || row.service,
          row.message,
          row.summary,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return fields.includes(q);
      });
    }

    if (dateFrom) rows = rows.filter((row) => row.created_at && new Date(row.created_at) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((row) => row.created_at && new Date(row.created_at) <= new Date(dateTo));

    return rows.sort((a, b) => {
      if (sortBy === 'name') return (a.displayName || '').localeCompare(b.displayName || '');
      if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [crmLeads, crmStageFilters, debouncedQuery, sortBy, dateFrom, dateTo]);

  const allVisibleIds = filteredLeads.map((lead) => lead.id).filter((id) => id != null);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  const toggleAll = useCallback(() => {
    const next = new Set(selected);
    if (allSelected) allVisibleIds.forEach((id) => next.delete(id));
    else allVisibleIds.forEach((id) => next.add(id));
    setSelected(next);
  }, [selected, allSelected, allVisibleIds]);

  const toggleOne = (id) => {
    if (id == null) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'a' && isWebView) {
        event.preventDefault();
        toggleAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isWebView, toggleAll]);

  const clearFilters = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setSortBy('newest');
  };

  const handleSaveToCrm = async (webLead) => {
    try {
      const leadId = webLead.id;
      if (!leadId) throw new Error('Missing web lead id');
      await transferLead({ lead_id: leadId });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      await Promise.all([loadInboxLeads(), loadCrmLeads()]);
    } catch (error) {
      alert(`Save to pipeline failed: ${String(error).slice(0, 200)}`);
    }
  };

  const handleBulkSave = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      for (const id of ids) {
        await transferLead({ lead_id: id });
      }
      setSelected(new Set());
      await Promise.all([loadInboxLeads(), loadCrmLeads()]);
    } catch (error) {
      alert(`Bulk save failed: ${String(error).slice(0, 200)}`);
    }
  };

  const handleArchive = async (webLead) => {
    try {
      const leadId = webLead.id;
      if (!leadId) throw new Error('Missing web lead id');
      await archiveWebLead(leadId);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      await loadInboxLeads();
    } catch (error) {
      alert(`Archive failed: ${String(error).slice(0, 200)}`);
    }
  };

  const handleSpam = async (webLead) => {
    try {
      const leadId = webLead.id;
      if (!leadId) throw new Error('Missing web lead id');
      await spamWebLead(leadId);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      await loadInboxLeads();
    } catch (error) {
      alert(`Spam failed: ${String(error).slice(0, 200)}`);
    }
  };

  const listTitle = isWebView ? copy.webLeadTitle : copy.leads;
  const listCount = isWebView ? filteredLeads.length : filteredCrmLeads.length;
  const listLoading = isWebView ? loadingInbox : loadingCrm;
  const listError = isWebView ? errorInbox : errorCrm;
  const statusLabel = crmStageFilters.length
    ? crmStageFilters.map((stage) => getPipelineStageLabel(stage)).join(' / ')
    : 'all';

  return (
    <div className='leads-page'>
      <FiltersBar
        left={
          isWebView ? (
            <ActionButton
              variant='secondary'
              size='sm'
              onClick={toggleAll}
              title={allSelected ? 'Unselect all visible' : 'Select all visible leads'}
              disabled={!allVisibleIds.length}
            >
              {allSelected ? 'None' : 'All'}
            </ActionButton>
          ) : null
        }
        center={
          <>
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isWebView
                  ? 'Search name, email, phone, service, source...'
                  : 'Search leads by name, email, phone, summary...'
              }
            />
            <input
              className='filters-input'
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              title='From date'
            />
            <input
              className='filters-input'
              type='date'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              title='To date'
            />
            {(query || dateFrom || dateTo || sortBy !== 'newest') && (
              <ActionButton variant='ghost' size='sm' onClick={clearFilters}>
                Clear
              </ActionButton>
            )}
          </>
        }
        right={
          <>
            <select
              className='filters-select'
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              disabled={isWebView}
            >
              <option value='newest'>Newest first</option>
              <option value='oldest'>Oldest first</option>
              <option value='name'>Name A-Z</option>
            </select>

            <div className='filters-view-toggle' role='tablist' aria-label='View mode'>
              <button
                className={`filters-button ${view === 'grid' ? 'active' : ''}`}
                onClick={() => setView('grid')}
                role='tab'
                aria-selected={view === 'grid'}
              >
                Grid
              </button>
              <button
                className={`filters-button ${view === 'list' ? 'active' : ''}`}
                onClick={() => setView('list')}
                role='tab'
                aria-selected={view === 'list'}
              >
                List
              </button>
            </div>

            <ActionButton
              variant='primary'
              size='sm'
              onClick={() =>
                setActiveLead({
                  object: 'lead',
                  name: '',
                  email: '',
                  phone_number: '',
                  address: '',
                  service_type: '',
                  lead_source: '',
                  notes: '',
                  industry: getIndustry('general'),
                  status: 'new',
                  attributes: {},
                })
              }
              title='Create a new lead manually'
            >
              + New Lead
            </ActionButton>

            {isWebView ? (
              <ActionButton variant='secondary' size='sm' disabled={selected.size === 0} onClick={handleBulkSave}>
                Add {selected.size || ''} to Pipeline
              </ActionButton>
            ) : null}
          </>
        }
      />

      {isWebView ? (
        <div className='inbox-tabs' role='tablist' aria-label='Lead inbox'>
          <button className='inbox-tab active' role='tab' aria-selected='true'>
            New Requests
          </button>
          <button className='inbox-tab' role='tab' aria-selected='false' disabled>
            Archived
          </button>
          <button className='inbox-tab' role='tab' aria-selected='false' disabled>
            Spam
          </button>
        </div>
      ) : null}

      <h2 className='lead-section-title'>
        {listTitle} - {listCount} result{listCount === 1 ? '' : 's'}
        {!isWebView && crmStageFilters.length ? ` (${statusLabel})` : ''}
      </h2>
      <p className='lead-section-hint'>
        {isWebView
          ? 'New Requests shows website lead rows only. Once transferred, they leave this queue and appear only in the CRM pipeline.'
          : 'Pipeline views show CRM leads only. Archived or converted leads stay out of the active queue unless you are viewing booked or lost history.'}
      </p>

      {listLoading ? <p className='loading'>Loading...</p> : null}
      {listError ? <p className='error'>{listError}</p> : null}

      {!listLoading && !listError && isWebView && filteredLeads.length > 0 ? (
        <div className={`lead-grid ${view}`}>
          {filteredLeads.map((lead) => (
            <WebLeadCard
              key={`web-${lead.id ?? lead.created_at}`}
              lead={lead}
              view={view}
              selected={selected.has(lead.id)}
              onToggle={toggleOne}
              onAdd={handleSaveToCrm}
              onArchive={handleArchive}
              onSpam={handleSpam}
              onOpen={setActiveLead}
            />
          ))}
        </div>
      ) : null}

      {!listLoading && !listError && !isWebView && filteredCrmLeads.length > 0 ? (
        <div className={`lead-grid ${view}`}>
          <LeadsList leads={filteredCrmLeads} view={view} onLeadClick={(lead) => setActiveLead(lead)} />
        </div>
      ) : null}

      {!listLoading && !listError && listCount === 0 ? <div className='empty'>{copy.leadsEmpty}</div> : null}

      {activeLead ? (
        <CustomerPopup
          lead={activeLead}
          leadType='lead'
          onClose={() => {
            setActiveLead(null);
            loadInboxLeads();
            loadCrmLeads();
          }}
        />
      ) : null}
    </div>
  );
}
