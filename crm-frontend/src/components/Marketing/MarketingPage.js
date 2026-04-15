import React, { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Campaigns from './Campaigns';
import InsightPanel from '../ui/InsightPanel';
import StatCard from '../ui/StatCard';
import WidgetGrid from '../ui/WidgetGrid';
import WidgetPanel from '../ui/WidgetPanel';
import { Megaphone, MousePointerClick, Target, TrendingUp } from 'lucide-react';
import './MarketingPage.css';

const socialMetricsData = [
  { day: 'Mon', impressions: 2600, clicks: 310, conversions: 42 },
  { day: 'Tue', impressions: 2900, clicks: 368, conversions: 48 },
  { day: 'Wed', impressions: 2700, clicks: 355, conversions: 46 },
  { day: 'Thu', impressions: 3400, clicks: 428, conversions: 62 },
  { day: 'Fri', impressions: 3620, clicks: 452, conversions: 65 },
  { day: 'Sat', impressions: 2800, clicks: 320, conversions: 43 },
  { day: 'Sun', impressions: 2400, clicks: 280, conversions: 35 },
];

const adsPerformanceData = [
  { name: 'Search Ads', value: 44 },
  { name: 'Display Ads', value: 26 },
  { name: 'Email Flows', value: 18 },
  { name: 'Referrals', value: 12 },
];

const PIE_COLORS = ['var(--accent)', 'var(--accent-secondary)', '#f59e0b', '#8b5cf6'];

function MarketingDashboard() {
  const stats = useMemo(() => {
    const impressions = socialMetricsData.reduce((sum, item) => sum + item.impressions, 0);
    const clicks = socialMetricsData.reduce((sum, item) => sum + item.clicks, 0);
    const conversions = socialMetricsData.reduce((sum, item) => sum + item.conversions, 0);
    const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    return [
      {
        label: 'Campaign Reach',
        value: `${impressions.toLocaleString()}`,
        meta: 'Weekly impressions',
        icon: <Megaphone size={15} />,
      },
      {
        label: 'Click Through Rate',
        value: `${ctr}%`,
        meta: 'Clicks / impressions',
        icon: <MousePointerClick size={15} />,
      },
      {
        label: 'Lead Conversions',
        value: `${conversions}`,
        meta: 'Campaign-attributed conversions',
        icon: <Target size={15} />,
      },
      {
        label: 'Pipeline Influence',
        value: '$42,600',
        meta: 'Marketing-sourced revenue',
        icon: <TrendingUp size={15} />,
      },
    ];
  }, []);

  const tasks = useMemo(
    () => [
      {
        id: 'segment-refresh',
        title: 'Refresh dormant-customer segment',
        subtitle: 'Trigger reactivation sequence for 74 contacts',
        value: 'Retention',
      },
      {
        id: 'ads-budget',
        title: 'Shift 12% budget to highest-ROI channel',
        subtitle: 'Search ads outperforming display this week',
        value: 'Budget',
      },
      {
        id: 'landing-audit',
        title: 'Audit landing page conversion friction',
        subtitle: 'Drop-off increases after form step two',
        value: 'Conversion',
      },
    ],
    []
  );

  return (
    <div className='marketing-page'>
      <header className='marketing-header'>
        <div>
          <p>Marketing</p>
          <h1>Marketing Operations</h1>
          <span>Campaign signal tracking, attribution, and execution recommendations.</span>
        </div>
      </header>

      <WidgetGrid columns={4} className='marketing-stat-grid'>
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} meta={item.meta} icon={item.icon} />
        ))}
      </WidgetGrid>

      <div className='marketing-grid'>
        <WidgetPanel title='Campaign Momentum' subtitle='Impressions, clicks, and conversions'>
          <div className='marketing-chart'>
            <ResponsiveContainer width='100%' height={220}>
              <LineChart data={socialMetricsData}>
                <CartesianGrid stroke='rgba(148,163,184,0.18)' strokeDasharray='3 3' />
                <XAxis dataKey='day' stroke='var(--text-sub)' />
                <YAxis stroke='var(--text-sub)' />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 10,
                  }}
                />
                <Legend />
                <Line type='monotone' dataKey='impressions' stroke='var(--accent)' strokeWidth={3} dot={false} />
                <Line type='monotone' dataKey='clicks' stroke='var(--accent-secondary)' strokeWidth={2.5} dot={false} />
                <Line type='monotone' dataKey='conversions' stroke='#f59e0b' strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </WidgetPanel>

        <WidgetPanel title='Channel Mix' subtitle='Attribution distribution'>
          <div className='marketing-chart'>
            <ResponsiveContainer width='100%' height={220}>
              <PieChart>
                <Pie data={adsPerformanceData} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={84} label>
                  {adsPerformanceData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 10,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </WidgetPanel>

        <WidgetPanel title='Conversion Trend' subtitle='Weekly conversion lift'>
          <div className='marketing-chart'>
            <ResponsiveContainer width='100%' height={220}>
              <AreaChart data={socialMetricsData}>
                <CartesianGrid stroke='rgba(148,163,184,0.18)' strokeDasharray='3 3' />
                <XAxis dataKey='day' stroke='var(--text-sub)' />
                <YAxis stroke='var(--text-sub)' />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 10,
                  }}
                />
                <Area type='monotone' dataKey='conversions' stroke='var(--accent)' fill='rgba(var(--accent-rgb),0.22)' />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WidgetPanel>

        <InsightPanel title='Suggested Tasks' items={tasks} />
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Routes>
      <Route index element={<MarketingDashboard />} />
      <Route path='campaigns' element={<Campaigns />} />
      <Route path='*' element={<MarketingDashboard />} />
    </Routes>
  );
}
