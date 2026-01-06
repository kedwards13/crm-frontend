import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import './RevenueChartWidget.css';

function getDynamicRevenueData() {
  const now = new Date();
  const data = [];
  for (let i = -3; i <= 2; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthAbbr = date.toLocaleString('default', { month: 'short' });
    const base = 40000 + i * 5000;
    const revenue = base + Math.floor(Math.random() * 3000);
    data.push({ month: monthAbbr, sortValue: date.getTime(), revenue });
  }
  data.sort((a, b) => a.sortValue - b.sortValue);
  return data;
}

const RevenueChartWidget = ({ data = getDynamicRevenueData() }) => {
  return (
    <div className="revenue-chart-widget">
      <h3 className="widget-title">Revenue</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid stroke="var(--border-0)" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="category"
              scale="band"
              interval={0}
              tick={{
                fontSize: 10,
                fill: 'var(--text-2)',
                angle: -45,
                textAnchor: 'end',
              }}
              tickMargin={10}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-1)', border: '1px solid var(--border-0)', color: 'var(--text-0)' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--accent-0)"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChartWidget;
