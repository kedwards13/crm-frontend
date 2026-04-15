import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Loader2,
  Route,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../apiClient';
import { normalizeArray } from '../../api/client';
import ActionButton from '../ui/ActionButton';
import InsightPanel from '../ui/InsightPanel';
import StatCard from '../ui/StatCard';
import WidgetGrid from '../ui/WidgetGrid';
import './RightInsightsPanel.css';

const toRows = (payload) => normalizeArray(payload || []);

const toMoney = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '$0.00';
  return `$${numeric.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};

const compactDate = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const CONTEXTS = [
  {
    key: 'leads',
    match: (path) => path.startsWith('/leads'),
    eyebrow: 'Leads',
    subtitle: 'Intent, priority, and response-time execution.',
    links: {
      opportunities: '/leads/pipeline',
      followUps: '/dashboard/tasks',
      suggested: '/leads/intake',
    },
  },
  {
    key: 'customers',
    match: (path) => path.startsWith('/customers'),
    eyebrow: 'Customer Health',
    subtitle: 'Retention signals and expansion opportunities.',
    links: {
      opportunities: '/customers/ai',
      followUps: '/customers/care',
      suggested: '/customers/list',
    },
  },
  {
    key: 'schedule',
    match: (path) => path.startsWith('/schedule'),
    eyebrow: 'Field Operations',
    subtitle: 'Route utilization and technician load balancing.',
    links: {
      opportunities: '/schedule/range',
      followUps: '/schedule/appointments',
      suggested: '/schedule/day',
    },
  },
  {
    key: 'finance',
    match: (path) => path.startsWith('/finance'),
    eyebrow: 'Finance Operations',
    subtitle: 'Cashflow visibility and collections follow-up.',
    links: {
      opportunities: '/finance/invoices',
      followUps: '/finance/payments',
      suggested: '/finance/billing',
    },
  },
  {
    key: 'marketing',
    match: (path) => path.startsWith('/marketing'),
    eyebrow: 'Growth Operations',
    subtitle: 'Campaign leverage and retention workflow tuning.',
    links: {
      opportunities: '/marketing/campaigns',
      followUps: '/dashboard/tasks',
      suggested: '/marketing/ai',
    },
  },
  {
    key: 'analytics',
    match: (path) => path.startsWith('/analytics'),
    eyebrow: 'Analytics',
    subtitle: 'Trend awareness and performance intervention.',
    links: {
      opportunities: '/analytics',
      followUps: '/dashboard/tasks',
      suggested: '/dashboard',
    },
  },
];

function resolveContext(pathname) {
  return CONTEXTS.find((context) => context.match(pathname)) || {
    key: 'operations',
    eyebrow: 'Operations',
    subtitle: 'Live operational signals across revenue and service delivery.',
    links: {
      opportunities: '/revival/opportunities',
      followUps: '/dashboard/tasks',
      suggested: '/dashboard',
    },
  };
}

function buildSuggestedTasks(contextKey, { opportunities, pendingTasks, routeEfficiency, customerMetrics }) {
  const atRiskCustomers = Number(customerMetrics?.at_risk_customers || 0);
  const efficiencyScore = Math.round(
    Number(routeEfficiency?.summary?.efficiency_score || routeEfficiency?.overall_efficiency || 0)
  );
  const pendingCount = pendingTasks.length;
  const opportunitiesCount = opportunities.length;

  if (contextKey === 'schedule') {
    return [
      {
        id: 'route-balance',
        title: `Rebalance ${Math.max(1, Math.ceil(pendingCount / 2))} technician routes`,
        subtitle: `Current efficiency ${efficiencyScore || 0}%`,
        value: 'Route planner',
      },
      {
        id: 'route-gap',
        title: 'Audit unassigned appointments',
        subtitle: `${pendingCount} follow-ups due`,
        value: 'Schedule queue',
      },
      {
        id: 'route-map',
        title: 'Validate drive-time hotspots',
        subtitle: 'Map + route view',
        value: 'Map review',
      },
    ];
  }

  if (contextKey === 'customers') {
    return [
      {
        id: 'retention',
        title: `Review ${atRiskCustomers || 0} at-risk customers`,
        subtitle: 'Prioritize renewals and callbacks',
        value: 'Customer care',
      },
      {
        id: 'upsell',
        title: `Convert ${Math.max(1, opportunitiesCount)} expansion opportunities`,
        subtitle: 'Use account-level service insights',
        value: 'Growth play',
      },
      {
        id: 'nps',
        title: 'Trigger post-service feedback cycle',
        subtitle: 'Capture churn signals early',
        value: 'Retention',
      },
    ];
  }

  if (contextKey === 'finance') {
    return [
      {
        id: 'collections',
        title: 'Prioritize outstanding collections',
        subtitle: `${pendingCount} billing follow-ups pending`,
        value: 'Collections',
      },
      {
        id: 'invoice-review',
        title: 'Review delayed invoice approvals',
        subtitle: `${opportunitiesCount} revenue opportunities tied to receivables`,
        value: 'Invoice ops',
      },
      {
        id: 'rebill',
        title: 'Rebill failed transactions',
        subtitle: 'Reduce monthly leakage',
        value: 'Revenue recovery',
      },
    ];
  }

  return [
    {
      id: 'followup',
      title: `Execute ${pendingCount || 0} pending follow-ups`,
      subtitle: 'Preserve response-time SLAs',
      value: 'Task queue',
    },
    {
      id: 'opportunities',
      title: `Activate ${Math.max(1, opportunitiesCount)} revenue opportunities`,
      subtitle: 'Focus high-value accounts first',
      value: 'Pipeline',
    },
    {
      id: 'optimization',
      title: 'Run daily service optimization review',
      subtitle: `Field efficiency at ${efficiencyScore || 0}%`,
      value: 'Ops review',
    },
  ];
}

export default function RightInsightsPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useMemo(() => resolveContext(location.pathname), [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opportunities, setOpportunities] = useState([]);
  const [insights, setInsights] = useState(null);
  const [routeEfficiency, setRouteEfficiency] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [customerMetrics, setCustomerMetrics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [opportunitiesRes, insightsRes, routeRes, tasksRes, customerMetricsRes] = await Promise.all([
        api.get('/opportunities/', { params: { page_size: 6 } }).catch(() => ({ data: [] })),
        api.get('/revenue-insights/').catch(() => ({ data: null })),
        api.get('/route-efficiency/').catch(() => ({ data: null })),
        api.get('/tasks/', { params: { status: 'pending', page_size: 6 } }).catch(() => ({ data: [] })),
        api.get('/customers/metrics/').catch(() => ({ data: null })),
      ]);

      setOpportunities(toRows(opportunitiesRes.data));
      setInsights(insightsRes.data || null);
      setRouteEfficiency(routeRes.data || null);
      setPendingTasks(toRows(tasksRes.data));
      setCustomerMetrics(customerMetricsRes.data || null);
    } catch (err) {
      setError(err?.message || 'Unable to load live insight data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, context.key]);

  const cards = useMemo(() => {
    const summary = insights?.summary || {};
    const routeSummary = routeEfficiency?.summary || routeEfficiency || {};
    const atRisk = Number(customerMetrics?.at_risk_customers || summary.inactive_customers || summary.at_risk_customers || 0);
    const efficiency = Math.round(Number(routeSummary.efficiency_score || routeSummary.overall_efficiency || 0)) || 0;
    return [
      {
        key: 'revenue',
        label: 'Revenue Opportunities',
        value: String(summary.total_opportunities || opportunities.length || 0),
        meta: `Potential ${toMoney(summary.estimated_revenue_recovery || 0)}`,
        icon: <TrendingUp size={15} />,
      },
      {
        key: 'customer',
        label: 'Customer Insights',
        value: String(atRisk || 0),
        meta: 'At-risk or inactive accounts',
        icon: <Users size={15} />,
      },
      {
        key: 'service',
        label: 'Service Optimization',
        value: `${efficiency}%`,
        meta: 'Current route efficiency',
        icon: <Route size={15} />,
      },
    ];
  }, [customerMetrics, insights, opportunities.length, routeEfficiency]);

  const opportunityItems = useMemo(
    () =>
      opportunities.slice(0, 4).map((item) => ({
        id: item.id || `${item.type}-${item.customer_id}`,
        title: item.type || item.opportunity_type || 'Opportunity',
        subtitle: item.customer_name || item.source || 'Customer segment',
        value: toMoney(item.estimated_value || item.potential_value || 0),
      })),
    [opportunities]
  );

  const followUpItems = useMemo(
    () =>
      pendingTasks.slice(0, 4).map((task) => ({
        id: task.id || `${task.title}-${task.due_date}`,
        title: task.title || 'Pending task',
        subtitle: task.task_type || 'follow_up',
        value: compactDate(task.due_date || task.created_at),
      })),
    [pendingTasks]
  );

  const suggestedItems = useMemo(
    () =>
      buildSuggestedTasks(context.key, {
        opportunities,
        pendingTasks,
        routeEfficiency,
        customerMetrics,
      }),
    [context.key, opportunities, pendingTasks, routeEfficiency, customerMetrics]
  );

  return (
    <div className='insights-shell'>
      <div className='insights-head'>
        <div>
          <p>{context.eyebrow}</p>
          <h3>Insights</h3>
          <span>{context.subtitle}</span>
        </div>
        <ActionButton
          variant='ghost'
          size='sm'
          className='insights-refresh-btn'
          onClick={load}
          aria-label='Refresh insights'
        >
          {loading ? <Loader2 size={15} className='spin' /> : <BarChart3 size={15} />}
        </ActionButton>
      </div>

      {error ? (
        <div className='insights-alert'>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      ) : null}

      <WidgetGrid columns={1} className='insight-metric-grid'>
        {cards.map((item) => (
          <StatCard
            key={item.key}
            label={item.label}
            value={item.value}
            meta={item.meta}
            icon={item.icon}
            loading={loading}
          />
        ))}
      </WidgetGrid>

      <InsightPanel
        title='Revenue Opportunities'
        items={opportunityItems}
        empty='No open opportunities found.'
        actions={
          <ActionButton variant='ghost' size='sm' onClick={() => navigate(context.links.opportunities)}>
            Open
            <ArrowRight size={13} />
          </ActionButton>
        }
      />

      <InsightPanel
        title='Follow-up Queue'
        items={followUpItems}
        empty='No pending follow-ups.'
        actions={
          <ActionButton variant='ghost' size='sm' onClick={() => navigate(context.links.followUps)}>
            Tasks
            <ArrowRight size={13} />
          </ActionButton>
        }
      />

      <InsightPanel
        title='Suggested Tasks'
        items={suggestedItems}
        actions={
          <ActionButton variant='ghost' size='sm' onClick={() => navigate(context.links.suggested)}>
            Review
            <Zap size={13} />
          </ActionButton>
        }
      />
    </div>
  );
}
