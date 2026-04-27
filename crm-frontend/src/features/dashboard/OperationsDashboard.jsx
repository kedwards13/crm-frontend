import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, Flame, Gauge, Inbox, TrendingUp, UserRound, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../apiClient';
import { getRevenueSummary } from '../../api/analyticsApi';
import { normalizeArray } from '../../api/client';
import StatCard from '../../components/ui/StatCard';
import WidgetGrid from '../../components/ui/WidgetGrid';
import WidgetPanel from '../../components/ui/WidgetPanel';
import './OperationsDashboard.css';

const sampleTrend = [
  { label: 'Mon', revenue: 4200, leads: 8 },
  { label: 'Tue', revenue: 5100, leads: 11 },
  { label: 'Wed', revenue: 4700, leads: 10 },
  { label: 'Thu', revenue: 6200, leads: 13 },
  { label: 'Fri', revenue: 6800, leads: 14 },
  { label: 'Sat', revenue: 5300, leads: 9 },
  { label: 'Sun', revenue: 3900, leads: 6 },
];

const toRows = (value) => normalizeArray(value || []);

const toMoney = (value) => {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const mapOpportunities = (rows = []) =>
  rows.slice(0, 5).map((item) => ({
    id: item.id || `${item.type}-${item.customer_id}`,
    type: item.type || item.opportunity_type || 'Opportunity',
    source: item.customer_name || item.source || 'Customer',
    value: Number(item.estimated_value || item.potential_value || 0),
  }));

const formatDate = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function OperationsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({});
  const [revenueSummary, setRevenueSummary] = useState({});
  const [trend, setTrend] = useState(sampleTrend);
  const [appointments, setAppointments] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [metricsRes, summaryRes, opportunitiesRes, schedulesRes] = await Promise.all([
        api.get('/dashboard/metrics/').catch(() => ({ data: {} })),
        getRevenueSummary().catch(() => ({ data: {} })),
        api.get('/opportunities/', { params: { page_size: 12 } }).catch(() => ({ data: [] })),
        api.get('/scheduling/schedules/', { params: { page_size: 20 } }).catch(() => ({ data: [] })),
      ]);

      if (!mounted) return;
      const metricPayload = metricsRes.data || {};
      const weekly = Array.isArray(metricPayload?.weekly) ? metricPayload.weekly : sampleTrend;
      setMetrics(metricPayload);
      setRevenueSummary(summaryRes.data || {});
      setTrend(
        weekly.map((item, idx) => ({
          label: item.label || item.day || sampleTrend[idx]?.label || `D${idx + 1}`,
          revenue: Number(item.revenue || item.total_revenue || sampleTrend[idx]?.revenue || 0),
          leads: Number(item.leads || item.new_leads || sampleTrend[idx]?.leads || 0),
        }))
      );
      setOpportunities(mapOpportunities(toRows(opportunitiesRes.data)));
      setAppointments(
        toRows(schedulesRes.data)
          .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0))
          .slice(0, 6)
      );
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const isRecurring = String(revenueSummary?.model || '') === 'recurring';
  const summaryForecast = useMemo(() => revenueSummary?.sales_flow_forecast || {}, [revenueSummary]);
  const leaderboardRows = Array.isArray(revenueSummary?.sales_rep_leaderboard)
    ? revenueSummary.sales_rep_leaderboard
    : [];

  const scorecards = useMemo(
    () => [
      {
        label: isRecurring ? 'Active MRR' : 'Booked Revenue',
        value: toMoney(
          isRecurring
            ? revenueSummary?.mrr
            : revenueSummary?.booked_revenue || metrics?.mtd_revenue || metrics?.revenue || trend.reduce((sum, row) => sum + row.revenue, 0)
        ),
        icon: TrendingUp,
      },
      {
        label: isRecurring ? 'Collected Revenue' : 'Collected Revenue',
        value: toMoney(revenueSummary?.collected_revenue),
        icon: UserRound,
      },
      {
        label: isRecurring ? 'Churned MRR' : 'Remaining Revenue',
        value: toMoney(isRecurring ? revenueSummary?.churned_mrr : revenueSummary?.remaining_revenue),
        icon: Gauge,
      },
      {
        label: isRecurring ? 'Paused MRR' : 'Conversion',
        value: isRecurring
          ? toMoney(revenueSummary?.paused_mrr)
          : `${Math.round(Number(revenueSummary?.conversion_rate || metrics?.lead_conversion_rate || metrics?.conversion_rate || 0) * 100) || 0}%`,
        icon: CalendarClock,
      },
    ],
    [isRecurring, metrics, revenueSummary, trend]
  );

  const leadMetrics = useMemo(
    () => [
      {
        label: 'Needs Action',
        value: Number(metrics?.leads_needing_action ?? 0),
        meta: 'No contact in 24h',
        icon: Zap,
      },
      {
        label: 'Hot Leads',
        value: Number(metrics?.hot_leads ?? 0),
        meta: 'Score ≥ 70',
        icon: Flame,
      },
      {
        label: 'Stale Leads',
        value: Number(metrics?.stale_leads ?? 0),
        meta: '7+ days idle',
        icon: AlertTriangle,
      },
      {
        label: 'Website Pending',
        value: Number(metrics?.website_leads_pending ?? 0),
        meta: 'Not yet in CRM',
        icon: Inbox,
      },
    ],
    [metrics]
  );

  const summaryRows = useMemo(
    () =>
      isRecurring
        ? [
            ['Revenue Model', 'Recurring'],
            ['Total Contracted + Quoted Revenue', toMoney(revenueSummary?.booked_revenue)],
            ['Remaining Revenue', toMoney(revenueSummary?.remaining_revenue)],
            ['Active Agreements', Number(revenueSummary?.active_agreements || 0)],
            ['Inactive Agreements', Number(revenueSummary?.inactive_agreements || 0)],
            ['Orphan Quotes', Number(revenueSummary?.orphan_quote_count || 0)],
            ['Active Revenue', toMoney(revenueSummary?.active_revenue)],
            ['Inactive Revenue', toMoney(revenueSummary?.inactive_revenue)],
          ]
        : [
            ['Revenue Model', 'One-Time'],
            ['Booked Revenue', toMoney(revenueSummary?.booked_revenue)],
            ['Collected Revenue', toMoney(revenueSummary?.collected_revenue)],
            ['Remaining Revenue', toMoney(revenueSummary?.remaining_revenue)],
            ['Active Revenue', toMoney(revenueSummary?.active_revenue)],
            ['Inactive Revenue', toMoney(revenueSummary?.inactive_revenue)],
            ['Conversion Rate', `${Math.round(Number(revenueSummary?.conversion_rate || 0) * 100)}%`],
          ],
    [isRecurring, revenueSummary]
  );

  const forecastRows = useMemo(() => {
    const rows = [
      ['Open Leads', Number(summaryForecast?.open_lead_count || 0)],
      ['Quoted Leads', Number(summaryForecast?.quoted_lead_count || 0)],
      ['Avg Estimate', toMoney(summaryForecast?.avg_estimate_value)],
      ['Projected 30-Day Booked', toMoney(summaryForecast?.projected_booked_revenue_30_day)],
    ];
    if (isRecurring) {
      rows.push(['Projected MRR', toMoney(summaryForecast?.projected_mrr)]);
    }
    return rows;
  }, [isRecurring, summaryForecast]);

  return (
    <div className='ops-dashboard'>
      <header className='ops-dashboard-head'>
        <div>
          <p className='eyebrow'>Operations Dashboard</p>
          <h1>Dashboard</h1>
          <span>Revenue, conversion, field execution, and retention in one workspace.</span>
        </div>
        <button type='button' className='ops-link-btn' onClick={() => navigate('/analytics')}>
          Open Analytics
          <ArrowRight size={14} />
        </button>
      </header>

      <section>
        <WidgetGrid columns={4} className='ops-score-grid'>
          {leadMetrics.map(({ label, value, meta, icon: Icon }) => (
            <StatCard
              key={label}
              label={label}
              value={String(value)}
              meta={meta}
              icon={<Icon size={15} />}
              loading={loading}
            />
          ))}
        </WidgetGrid>
      </section>

      <section>
        <WidgetGrid columns={4} className='ops-score-grid'>
          {scorecards.map(({ label, value, icon: Icon }) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              icon={<Icon size={15} />}
              loading={loading}
            />
          ))}
        </WidgetGrid>
      </section>

      <section className='ops-chart-grid'>
        <WidgetPanel className='ops-panel' title='Revenue Summary'>
          <div className='ops-list'>
            {summaryRows.map(([label, value]) => (
              <div key={label} className='ops-list-row'>
                <div>
                  <strong>{label}</strong>
                </div>
                <em>{String(value)}</em>
              </div>
            ))}
          </div>
        </WidgetPanel>

        <WidgetPanel className='ops-panel' title='Sales Flow Forecast'>
          <div className='ops-list'>
            {forecastRows.map(([label, value]) => (
              <div key={label} className='ops-list-row'>
                <div>
                  <strong>{label}</strong>
                </div>
                <em>{String(value)}</em>
              </div>
            ))}
          </div>
        </WidgetPanel>
      </section>

      <section className='ops-split-grid'>
        <WidgetPanel
          className='ops-panel'
          title='Upcoming Appointments'
          actions={
            <button type='button' onClick={() => navigate('/schedule/day')}>
              Schedule
              <ArrowRight size={12} />
            </button>
          }
        >
          {appointments.length ? (
            <div className='ops-list'>
              {appointments.map((row) => {
                const customer =
                  row?.customer?.full_name ||
                  row?.customer?.name ||
                  [row?.customer?.first_name, row?.customer?.last_name].filter(Boolean).join(' ') ||
                  'Customer';
                const service =
                  row?.service_type?.name || row?.service_type_name || row?.offering?.name || 'Service';
                const technician =
                  row?.assigned_technician?.full_name ||
                  row?.assigned_technician?.name ||
                  row?.assigned_technician_name ||
                  'Unassigned';
                return (
                  <div key={row.id} className='ops-list-row'>
                    <div>
                      <strong>{customer}</strong>
                      <span>
                        {service} • {technician}
                      </span>
                    </div>
                    <em>{formatDate(row?.scheduled_start || row?.start_time || row?.start)}</em>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className='ops-empty'>No upcoming appointments found.</p>
          )}
        </WidgetPanel>

        <WidgetPanel
          className='ops-panel'
          title={isRecurring ? 'Agreement Health' : 'Sales Rep Leaderboard'}
          actions={
            <button type='button' onClick={() => navigate(isRecurring ? '/analytics/revenue' : '/analytics/revenue')}>
              Analytics
              <ArrowRight size={12} />
            </button>
          }
        >
          {!isRecurring && leaderboardRows.length ? (
            <div className='ops-list'>
              {leaderboardRows.slice(0, 5).map((item) => (
                <div key={item.id} className='ops-list-row'>
                  <div>
                    <strong>{item.rep_name || 'Unassigned'}</strong>
                    <span>{`${Math.round(Number(item.conversion_rate || 0) * 100)}% conversion`}</span>
                  </div>
                  <em>{toMoney(item.booked_revenue)}</em>
                </div>
              ))}
            </div>
          ) : isRecurring ? (
            <div className='ops-list'>
              <div className='ops-list-row'>
                <div>
                  <strong>Active Agreements</strong>
                  <span>Currently billing</span>
                </div>
                <em>{Number(revenueSummary?.active_agreements || 0)}</em>
              </div>
              <div className='ops-list-row'>
                <div>
                  <strong>Inactive Agreements</strong>
                  <span>Paused, expired, or canceled</span>
                </div>
                <em>{Number(revenueSummary?.inactive_agreements || 0)}</em>
              </div>
              <div className='ops-list-row'>
                <div>
                  <strong>Churned MRR</strong>
                  <span>Canceled and expired only</span>
                </div>
                <em>{toMoney(revenueSummary?.churned_mrr)}</em>
              </div>
              <div className='ops-list-row'>
                <div>
                  <strong>Paused MRR</strong>
                  <span>Temporarily inactive agreements</span>
                </div>
                <em>{toMoney(revenueSummary?.paused_mrr)}</em>
              </div>
            </div>
          ) : opportunities.length ? (
            <div className='ops-list'>
              {opportunities.map((item) => (
                <div key={item.id} className='ops-list-row'>
                  <div>
                    <strong>{item.type}</strong>
                    <span>{item.source}</span>
                  </div>
                  <em>{toMoney(item.value)}</em>
                </div>
              ))}
            </div>
          ) : (
            <p className='ops-empty'>{isRecurring ? 'No agreement summary available.' : 'No leaderboard rows yet.'}</p>
          )}
        </WidgetPanel>
      </section>
    </div>
  );
}
