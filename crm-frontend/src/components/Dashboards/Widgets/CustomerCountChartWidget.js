// src/components/Dashboards/Widgets/CustomerCountChartWidget.js
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import './CustomerCountChartWidget.css';

const data = [
  { name: 'Active', value: 120 },
  { name: 'Inactive', value: 30 },
];

const COLORS = ['#00f2fe', '#ff3b30']; // Neon blue and red

const CustomerCountChartWidget = () => {
  return (
    <div className="customer-count-widget">
      <h3 className="widget-title">Customer Overview</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="5"
                  floodColor="rgba(0, 242, 254, 0.6)"
                />
              </filter>
            </defs>
            <Pie
              data={data}
              dataKey="value"
              outerRadius={60}
              innerRadius={40}
              label
              filter="url(#pieShadow)"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#2c2c2e', border: 'none', color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="customer-count-details">
        {data.map(({ name, value }, index) => (
          <div key={name} className="detail-item">
            <span className="detail-label">{name}</span>
            <span className="detail-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerCountChartWidget;