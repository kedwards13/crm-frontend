// src/components/Analytics/AnalyticsPage.js

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import './AnalyticsPage.css';

// Sample Data
const monthlyData = [
  { month: 'Jan', value: 4000 },
  { month: 'Feb', value: 3000 },
  { month: 'Mar', value: 2000 },
  { month: 'Apr', value: 2780 },
  { month: 'May', value: 1890 },
  { month: 'Jun', value: 2390 },
  { month: 'Jul', value: 3490 },
];

const productSales = [
  { product: 'Product A', sales: 2400 },
  { product: 'Product B', sales: 1398 },
  { product: 'Product C', sales: 9800 },
  { product: 'Product D', sales: 3908 },
  { product: 'Product E', sales: 4800 },
];

// Temporary placeholder suggestions from AI
const aiSuggestions = [
  {
    id: 1,
    text: "Increase ad spend by 10% for next month to boost conversions.",
  },
  {
    id: 2,
    text: "Send targeted email campaigns to dormant customers.",
  },
  {
    id: 3,
    text: "Offer limited-time bundle deals to move excess inventory.",
  },
];

const AnalyticsPage = () => {
  return (
    <div className="analytics-page">
      <h1 className="page-title">Analytics Dashboard</h1>

      {/* Main Container: Left = Charts, Right = AI Panel */}
      <div className="analytics-container">
        
        {/* Charts Column */}
        <div className="charts-column">
          <div className="analytics-section">
            <h2>Monthly Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#706aff" />
                    <stop offset="50%" stopColor="#ff4397" />
                    <stop offset="100%" stopColor="#ff7743" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 8 }}
                  className="neon-line"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="analytics-section">
            <h2>Product Sales</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="product" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />
                <Bar dataKey="sales" fill="url(#barGradient)" />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#706aff" />
                    <stop offset="50%" stopColor="#ff4397" />
                    <stop offset="100%" stopColor="#ff7743" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* AI Insights Column */}
        <div className="ai-panel">
          <div className="ai-orb"></div>
          <h2 className="ai-panel-title">AI Insights</h2>
          <p className="ai-panel-subtitle">
            Your data shows a 15% increase in conversions this month!
          </p>

          <div className="ai-suggestions">
            <h3>AI Recommendations</h3>
            {aiSuggestions.map((suggestion) => (
              <div className="ai-suggestion-item" key={suggestion.id}>
                <p>{suggestion.text}</p>
                <div className="suggestion-actions">
                  <button className="approve-btn">Approve</button>
                  <button className="deny-btn">Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;