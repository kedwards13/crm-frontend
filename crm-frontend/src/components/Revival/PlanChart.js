import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import revivalApi from '../../api/revivalApi';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const buildMonthlyData = (quotes) => {
  const buckets = {};
  for (const q of quotes) {
    const d = new Date(q.created_at || q.scanned_at || q.updated_at);
    if (isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const value = Number(q.estimated_total ?? q.quote_total ?? q.total ?? q.amount ?? 0);
    if (!buckets[key]) buckets[key] = { month: MONTH_NAMES[d.getMonth()], value: 0 };
    buckets[key].value += Number.isFinite(value) ? value : 0;
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => ({ month: v.month, value: Math.round(v.value) }));
};

const PlanChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    revivalApi.getRecentScans({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const quotes = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setData(buildMonthlyData(quotes));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading chart...</div>;
  }

  if (!data.length) {
    return <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No revenue data yet. Upload scans to populate.</div>;
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="month" stroke="#888" />
          <YAxis stroke="#888" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4f8df9"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlanChart;