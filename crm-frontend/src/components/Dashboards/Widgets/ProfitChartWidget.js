// src/components/Dashboards/Widgets/ProfitChartWidget.js
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
import './ProfitChartWidget.css';

function getDynamicProfitData() {
  const now = new Date();
  const data = [];
  for (let i = -3; i <= 2; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthAbbr = date.toLocaleString('default', { month: 'short' });
    const base = 10000 + i * 2000;
    const profit = base + Math.floor(Math.random() * 1500);
    data.push({ month: monthAbbr, sortValue: date.getTime(), profit });
  }
  data.sort((a, b) => a.sortValue - b.sortValue);
  return data;
}

const ProfitChartWidget = ({ data = getDynamicProfitData() }) => {
  useEffect(() => {
    console.log('Profit data:', data);
  }, [data]);

  return (
    <div className="profit-chart-widget">
      <h3 className="widget-title">Profit</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#28a745" />
                <stop offset="100%" stopColor="#ffd60a" />
              </linearGradient>
              <filter id="lineShadowProfit" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="5"
                  floodColor="rgba(40,167,69,0.6)"
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
              dataKey="profit"
              stroke="url(#profitGradient)"
              strokeWidth={3}
              dot={false}
              filter="url(#lineShadowProfit)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProfitChartWidget;