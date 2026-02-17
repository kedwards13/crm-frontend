import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import api, { normalizeArray } from '../../apiClient';
import aiApi from '../../aiApiClient';
import { fetchInboxMessages } from '../../api/communications';
import { listCrmLeads } from '../../api/leadsApi';
import { getIndustryKey, getUiRegistry } from '../../constants/uiRegistry';
import { getActiveTenant, getUserRole } from '../../helpers/tenantHelpers';
import './Dashboard.css';

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const EMPTY_DATA = {
  leads: [],
  messages: [],
  metrics: {
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    contactedLeads: 0,
    inboxVolume: 0,
    unreadMessages: 0,
    answerRate: 0,
    totalCalls: 0,
  },
  statusCounts: {},
};

const makeMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toStatusKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') || 'unknown';

const formatStatus = (value = '') => {
  const normalized = String(value || 'unknown').replace(/_/g, ' ').trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getLeadName = (lead = {}) => {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim();
  return (
    lead.name ||
    fullName ||
    lead.company_name ||
    lead.primary_email ||
    lead.email ||
    lead.primary_phone ||
    lead.phone_number ||
    'Unnamed Lead'
  );
};

const toPlainText = (value = '') =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatRelativeTime = (value) => {
  if (!value) return 'just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';

  const diff = Date.now() - date.getTime();
  if (diff <= 0) return 'now';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  return `${Math.floor(diff / day)}d`;
};

const buildStatusCounts = (leads = []) =>
  leads.reduce((accumulator, lead) => {
    const key = toStatusKey(lead?.status);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

const formatCompact = (value) => {
  const numeric = Number(value) || 0;
  return compactNumberFormatter.format(numeric);
};

const getInitials = (value = '') =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'NA';

const normalizeRoleForAi = (role) => {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('manager')) return 'manager';
  if (normalized.includes('tech')) return 'tech';
  if (normalized.includes('customer')) return 'customer';
  return 'staff';
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const summarizeFallback = (snapshot, entityPlural) => {
  const noun = entityPlural.toLowerCase();
  const highlights = [];

  if (snapshot.metrics.unreadMessages > 0) {
    highlights.push(`${snapshot.metrics.unreadMessages} unread conversations need responses.`);
  }
  if (snapshot.metrics.newLeads > 0) {
    highlights.push(`${snapshot.metrics.newLeads} new ${noun} need first contact.`);
  }
  if (snapshot.metrics.totalCalls > 0) {
    highlights.push(
      `Answer rate is ${snapshot.metrics.answerRate}% across ${snapshot.metrics.totalCalls} tracked calls.`
    );
  }

  return `Live snapshot: ${snapshot.metrics.totalLeads} active ${noun}, ${snapshot.metrics.qualifiedLeads} qualified, and ${snapshot.metrics.inboxVolume} inbox messages. ${
    highlights.join(' ') || 'No urgent bottlenecks detected.'
  }`;
};

const buildRagContext = (snapshot, entityPlural) => {
  const topLeads = snapshot.leads
    .slice(0, 3)
    .map((lead) => `${lead.name} (${lead.status})`)
    .join('; ');
  const latestMessage = snapshot.messages[0];

  return [
    {
      source: 'dashboard.metrics',
      score: 0.96,
      text: `${snapshot.metrics.totalLeads} active ${entityPlural.toLowerCase()}, ${snapshot.metrics.newLeads} new, ${snapshot.metrics.qualifiedLeads} qualified, ${snapshot.metrics.inboxVolume} inbox messages, ${snapshot.metrics.unreadMessages} unread, answer rate ${snapshot.metrics.answerRate}%.`,
    },
    {
      source: 'dashboard.leads',
      score: 0.88,
      text: topLeads
        ? `Most recent ${entityPlural.toLowerCase()}: ${topLeads}.`
        : `No recent ${entityPlural.toLowerCase()} are available.`,
    },
    {
      source: 'dashboard.comms',
      score: 0.82,
      text: latestMessage
        ? `Latest communication from ${latestMessage.from}: "${latestMessage.text.slice(0, 160)}".`
        : 'No recent communications in the inbox feed.',
    },
  ];
};

const serializeAiReply = (payload, fallbackText) => {
  if (!payload || typeof payload !== 'object') return fallbackText;

  const summary =
    payload.summary || payload.response || payload.message || payload.suggested_reply || '';
  const insights = Array.isArray(payload.insights)
    ? payload.insights.filter(Boolean).slice(0, 2)
    : [];
  const actions = Array.isArray(payload.recommended_actions)
    ? payload.recommended_actions.filter(Boolean).slice(0, 2)
    : [];
  const requests = Array.isArray(payload.execution_requests)
    ? payload.execution_requests
        .map((item) => item?.reason || item?.notes || item?.type)
        .filter(Boolean)
        .slice(0, 2)
    : [];

  const lines = [];
  if (summary) lines.push(summary);
  insights.forEach((item) => lines.push(`Insight: ${item}`));
  actions.forEach((item) => lines.push(`Action: ${item}`));
  requests.forEach((item) => lines.push(`Request: ${item}`));

  return lines.length ? lines.join('\n') : fallbackText;
};

const askDashboardAssistant = async ({ prompt, snapshot, entityPlural }) => {
  const tenant = getActiveTenant() || {};
  const user = getStoredUser();
  const fallback = summarizeFallback(snapshot, entityPlural);

  const tenantId = String(tenant.id || tenant.tenant_id || tenant.domain || tenant.name || '').trim();
  if (!tenantId) return fallback;

  const payload = {
    tenant_id: tenantId,
    actor: {
      id: String(user.id || user.user_id || user.email || 'crm-user'),
      role: normalizeRoleForAi(user.role || getUserRole('Member')),
    },
    task: 'dashboard_assistant',
    input: prompt,
    rag_context: buildRagContext(snapshot, entityPlural),
  };

  try {
    const response = await aiApi.post('/chat', payload);
    return serializeAiReply(response?.data, fallback);
  } catch {
    return fallback;
  }
};

const fetchDashboardData = async () => {
  const issues = [];

  const [leadResult, inboxResult, analyticsResult] = await Promise.allSettled([
    listCrmLeads(),
    fetchInboxMessages({ archived: false }),
    api.get('/comms/analytics/overview'),
  ]);

  let leadsPayload = [];
  let inboxPayload = [];
  let analyticsTotals = {};

  if (leadResult.status === 'fulfilled') {
    leadsPayload = normalizeArray(leadResult.value?.data);
  } else {
    issues.push('Leads feed unavailable.');
  }

  if (inboxResult.status === 'fulfilled') {
    inboxPayload = Array.isArray(inboxResult.value)
      ? inboxResult.value
      : normalizeArray(inboxResult.value);
  } else {
    issues.push('Inbox feed unavailable.');
  }

  if (analyticsResult.status === 'fulfilled') {
    analyticsTotals = analyticsResult.value?.data?.totals || {};
  } else {
    issues.push('Call analytics unavailable.');
  }

  const leadRows = Array.isArray(leadsPayload) ? leadsPayload : [];
  const messageRows = Array.isArray(inboxPayload) ? inboxPayload : [];
  const statusCounts = buildStatusCounts(leadRows);
  const answerRateRaw = Number(analyticsTotals.answer_rate);

  const data = {
    leads: leadRows.slice(0, 20).map((lead, index) => ({
      id: lead.id || lead.lead_id || lead.universal_id || `lead-${index}`,
      name: getLeadName(lead),
      status: formatStatus(lead.status),
      company:
        lead.company_name ||
        lead.service ||
        lead.primary_email ||
        lead.email ||
        lead.primary_phone ||
        lead.phone_number ||
        'No profile details',
      priorityScore:
        lead.priority_score === null || lead.priority_score === undefined
          ? null
          : Number(lead.priority_score),
      createdAt: lead.updated_at || lead.created_at || null,
      raw: lead,
    })),
    messages: messageRows.slice(0, 12).map((message, index) => ({
      id: message.id || `message-${index}`,
      from:
        message.from ||
        message.contact_name ||
        message.contact_phone ||
        message.conact_phone ||
        message.contact_email ||
        'Unknown Sender',
      text: toPlainText(message.body || message.subject || ''),
      time: formatRelativeTime(message.timestamp),
      timestamp: message.timestamp || null,
      unread: message.is_read === false,
      channel: String(message.channel || 'sms').toUpperCase(),
      partyUniversalId: message.party_universal_id || null,
    })),
    metrics: {
      totalLeads: leadRows.length,
      newLeads: statusCounts.new || 0,
      qualifiedLeads: statusCounts.qualified || 0,
      contactedLeads: statusCounts.contacted || 0,
      inboxVolume: messageRows.length,
      unreadMessages: messageRows.filter((message) => message?.is_read === false).length,
      answerRate: Number.isFinite(answerRateRaw) ? Math.round(answerRateRaw * 100) : 0,
      totalCalls: Number(analyticsTotals.total_calls) || 0,
    },
    statusCounts,
  };

  return { data, issues };
};

const useDashboardData = () => {
  const [data, setData] = useState(EMPTY_DATA);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await fetchDashboardData();
    setData(next.data);
    setIssues(next.issues);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    issues,
    reload: load,
  };
};

const StatCard = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="titan-card stat-card" aria-label={label}>
    <div className="titan-stat-top">
      <div className={`titan-icon-badge tone-${tone}`}>
        <Icon size={20} />
      </div>
      <span className="titan-stat-detail">{detail}</span>
    </div>
    <div className="titan-value">{value}</div>
    <div className="titan-label">{label}</div>
  </article>
);

const LeadCarousel = ({ leads, entityLabel }) => (
  <section className="lead-carousel-section">
    <div className="lead-carousel-head">
      <div className="titan-label">Recent Active {entityLabel}</div>
    </div>
    {leads.length === 0 ? (
      <div className="titan-empty-state">No active {entityLabel.toLowerCase()} yet.</div>
    ) : (
      <div className="lead-track" role="list" aria-label={`Recent ${entityLabel}`}>
        {leads.map((lead) => (
          <article key={lead.id} className="lead-card" role="listitem" tabIndex={0}>
            <div className="lead-card-top">
              <span className="lead-name">{lead.name}</span>
              <span className="lead-card-value">
                {lead.priorityScore === null ? lead.status : `Priority ${lead.priorityScore}`}
              </span>
            </div>
            <div className="lead-meta">{lead.company}</div>
            <div className="lead-status-row">
              <span className="lead-status">{lead.status}</span>
              <span className="lead-time">{formatRelativeTime(lead.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);

const AiTerminal = ({ snapshot, entityPlural }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const logRef = useRef(null);

  const suggestions = useMemo(() => {
    const noun = entityPlural.toLowerCase();
    return [
      `Prioritize today's ${noun} by conversion likelihood.`,
      'Summarize unread conversations and suggest next actions.',
      snapshot.metrics.totalCalls > 0
        ? `What would improve a ${snapshot.metrics.answerRate}% answer rate?`
        : `What channel should we use first for new ${noun}?`,
    ];
  }, [entityPlural, snapshot.metrics.answerRate, snapshot.metrics.totalCalls]);

  const bootMessage = useMemo(
    () =>
      `Live telemetry online: ${snapshot.metrics.totalLeads} active ${entityPlural.toLowerCase()}, ${snapshot.metrics.unreadMessages} unread inbox messages, and ${snapshot.metrics.answerRate}% call answer rate.`,
    [
      entityPlural,
      snapshot.metrics.answerRate,
      snapshot.metrics.totalLeads,
      snapshot.metrics.unreadMessages,
    ]
  );

  useEffect(() => {
    setMessages([{ id: makeMessageId(), role: 'assistant', text: bootMessage }]);
  }, [bootMessage]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, typing]);

  const handleSend = useCallback(
    async (overridePrompt) => {
      const prompt = String(overridePrompt ?? input).trim();
      if (!prompt || typing) return;

      setMessages((previous) => [...previous, { id: makeMessageId(), role: 'user', text: prompt }]);
      setInput('');
      setTyping(true);

      const assistantReply = await askDashboardAssistant({
        prompt,
        snapshot,
        entityPlural,
      });

      setMessages((previous) => [
        ...previous,
        { id: makeMessageId(), role: 'assistant', text: assistantReply },
      ]);
      setTyping(false);
    },
    [entityPlural, input, snapshot, typing]
  );

  const onSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  return (
    <section className="titan-card ai-terminal" aria-label="AI assistant">
      <div className="ai-terminal-head">
        <div className="ai-brand">
          <span className="ai-avatar" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="ai-heading">AI Assistant</h2>
            <p className="ai-subheading">Tenant-scoped reasoning engine</p>
          </div>
        </div>
        <span className="ai-connection-pill">Connected</span>
      </div>

      <div className="ai-suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="ai-suggestion-button"
            onClick={() => handleSend(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="ai-message-log" ref={logRef} aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-row ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="ai-bubble">{message.text}</div>
          </div>
        ))}

        {typing && (
          <div className="ai-typing">
            <div className="ai-typing-dots" aria-hidden="true">
              <span className="ai-dot" />
              <span className="ai-dot" />
              <span className="ai-dot" />
            </div>
            Thinking
          </div>
        )}
      </div>

      <form className="ai-input-row" onSubmit={onSubmit}>
        <label htmlFor="dashboard-ai-input" className="sr-only">
          Ask dashboard assistant
        </label>
        <input
          id="dashboard-ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about leads, inbox strategy, and operations..."
          className="ai-input"
        />
        <button
          type="submit"
          className="ai-send-button"
          aria-label="Send message"
          disabled={!input.trim() || typing}
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
};

const MessageFeed = ({ messages }) => (
  <section className="titan-card comms-feed" aria-label="Live communications">
    <div className="comms-head">
      <div className="titan-label">Live Comms</div>
    </div>

    {messages.length === 0 ? (
      <div className="titan-empty-state">No recent communications yet.</div>
    ) : (
      <div className="comms-list" role="list">
        {messages.map((message) => (
          <article key={message.id} className="comms-item" role="listitem" tabIndex={0}>
            <div className="comms-avatar">{getInitials(message.from)}</div>
            <div className="comms-body">
              <div className="comms-row">
                <span className="comms-name">{message.from}</span>
                <span className="comms-time">{message.time}</span>
              </div>
              <p className="comms-preview">{message.text || 'No message body'}</p>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);

export default function Dashboard() {
  const industryKey = getIndustryKey();
  const ui = getUiRegistry(industryKey);
  const entity = ui.primaryEntity || 'Lead';
  const entityPlural = entity.endsWith('s') ? entity : `${entity}s`;
  const { data, loading, issues, reload } = useDashboardData();

  const stats = useMemo(
    () => [
      {
        label: `Active ${entityPlural}`,
        value: formatCompact(data.metrics.totalLeads),
        detail: `${data.metrics.qualifiedLeads} qualified`,
        icon: Users,
        tone: 'blue',
      },
      {
        label: `New ${entityPlural}`,
        value: formatCompact(data.metrics.newLeads),
        detail: `${data.metrics.contactedLeads} contacted`,
        icon: Activity,
        tone: 'emerald',
      },
      {
        label: 'Inbox Volume',
        value: formatCompact(data.metrics.inboxVolume),
        detail: `${data.metrics.unreadMessages} unread`,
        icon: MessageSquare,
        tone: 'violet',
      },
      {
        label: 'Call Answer Rate',
        value: `${data.metrics.answerRate}%`,
        detail: `${formatCompact(data.metrics.totalCalls)} calls`,
        icon: TrendingUp,
        tone: 'amber',
      },
    ],
    [data.metrics, entityPlural]
  );

  const hasData = data.leads.length > 0 || data.messages.length > 0 || data.metrics.totalCalls > 0;

  if (loading && !hasData) {
    return (
      <div className="titan-dashboard-state">
        <div>
          <Zap size={20} />
          <p>Syncing live dashboard telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="titan-dashboard">
      <header className="titan-dashboard-header">
        <div className="titan-header-copy">
          <h1 className="titan-title">Command Center</h1>
          <p className="titan-subtitle">
            Industry mode: {industryKey.replace(/_/g, ' ')}. System status:{' '}
            <span className="titan-status-pill">Operational</span>
          </p>
        </div>
        <div className="titan-header-actions">
          <button type="button" className="titan-refresh-button" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'titan-inline-spinner' : ''} />
            {loading ? 'Syncing' : 'Refresh Data'}
          </button>
        </div>
      </header>

      {issues.length > 0 && (
        <div className="titan-sync-warning">
          Some streams are degraded: {issues.join(' ')}
        </div>
      )}

      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}

      <LeadCarousel leads={data.leads} entityLabel={entityPlural} />
      <AiTerminal snapshot={data} entityPlural={entityPlural} />
      <MessageFeed messages={data.messages} />
    </div>
  );
}
