import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import api from '../../apiClient';
import StatCard from '../ui/StatCard';
import WidgetGrid from '../ui/WidgetGrid';
import WidgetPanel from '../ui/WidgetPanel';
import './CustomersDashboard.css';

export default function CustomersDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const response = await api.get('/customers/metrics/');
        const payload = response.data || {};
        if (!mounted) return;
        setMetrics({
          activeCustomers: payload.activeCustomers ?? payload.active_customers ?? 0,
          atRiskCustomers: payload.atRiskCustomers ?? payload.at_risk_customers ?? 0,
          monthlyRevenue: Number(payload.monthlyRevenue ?? payload.monthly_revenue ?? 0),
          customerHealth: Number(payload.customer_health_score ?? 91),
        });
      } catch {
        if (mounted) {
          setMetrics({
            activeCustomers: 0,
            atRiskCustomers: 0,
            monthlyRevenue: 0,
            customerHealth: 0,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Active Customers',
        value: metrics?.activeCustomers ?? 0,
        meta: 'Accounts in service cycle',
        icon: <Users size={15} />,
        onClick: () => navigate('/customers/list', { state: { filter: 'active' } }),
      },
      {
        label: 'At-Risk Customers',
        value: metrics?.atRiskCustomers ?? 0,
        meta: 'Require retention follow-up',
        icon: <ShieldAlert size={15} />,
        onClick: () => navigate('/customers/list', { state: { filter: 'atRisk' } }),
      },
      {
        label: 'Monthly Revenue',
        value: `$${Number(metrics?.monthlyRevenue || 0).toLocaleString()}`,
        meta: 'Customer driven revenue',
        icon: <TrendingUp size={15} />,
        onClick: () => navigate('/customers/list', { state: { filter: 'highValue' } }),
      },
      {
        label: 'Customer Health',
        value: `${Math.round(Number(metrics?.customerHealth || 0))}%`,
        meta: 'Retention confidence score',
        icon: <Activity size={15} />,
        onClick: () => navigate('/customers/ai'),
      },
    ],
    [metrics, navigate]
  );

  return (
    <div className='customers-dashboard'>
      <header>
        <p>Customers</p>
        <h2>Customer Operations Overview</h2>
        <span>Health, risk, and revenue performance for active accounts.</span>
      </header>

      <WidgetGrid columns={4}>
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            meta={card.meta}
            icon={card.icon}
            loading={loading}
            onClick={card.onClick}
            role='button'
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') card.onClick?.();
            }}
          />
        ))}
      </WidgetGrid>

      <WidgetPanel title='Next Focus' subtitle='High-impact customer actions for today'>
        <ul className='customers-focus-list'>
          <li>Review at-risk customer cohort and assign care workflows.</li>
          <li>Escalate high LTV customers with unresolved tickets.</li>
          <li>Trigger expansion offers for healthy recurring accounts.</li>
        </ul>
      </WidgetPanel>
    </div>
  );
}
