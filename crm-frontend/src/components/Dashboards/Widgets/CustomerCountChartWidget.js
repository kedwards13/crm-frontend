// src/components/Dashboards/Widgets/CustomerCountChartWidget.js
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import './CustomerCountChartWidget.css';

const data = [
  { name: 'Active', value: 120 },
  { name: 'Inactive', value: 30 },
];

const COLORS = ['#5c636a', '#9aa0a6'];

const CustomerCountChartWidget = () => {
  return (
    <div className="customer-count-widget">
      <h3 className="widget-title">Customer Overview</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              outerRadius={60}
              innerRadius={40}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-1)', border: '1px solid var(--border-0)', color: 'var(--text-0)' }}
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
