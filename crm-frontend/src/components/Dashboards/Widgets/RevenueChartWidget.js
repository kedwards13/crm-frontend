import React, { useEffect } from 'react';
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
  useEffect(() => {
    console.log('Revenue data:', data);
  }, [data]);

  return (
    <div className="revenue-chart-widget">
      <h3 className="widget-title">Revenue</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="100%" stopColor="#ff8c00" />
              </linearGradient>
              <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="5"
                  floodColor="rgba(0,242,254,0.6)"
                />
              </filter>
            </defs>
            <CartesianGrid stroke="#444446" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="category"
              scale="band"
              interval={0}
              tick={{
                fontSize: 10,
                fill: '#ccc',
                angle: -45,
                textAnchor: 'end',
              }}
              tickMargin={10}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#2c2c2e', border: 'none', color: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="url(#revenueGradient)"
              strokeWidth={3}
              dot={false}
              filter="url(#lineShadow)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChartWidget;