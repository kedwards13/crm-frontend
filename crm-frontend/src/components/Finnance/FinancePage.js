// src/components/Finance/FinancePage.js
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
import './FinancePage.css';

const revenueData = [
  { month: 'Jan', revenue: 40000 },
  { month: 'Feb', revenue: 45000 },
  { month: 'Mar', revenue: 47000 },
  { month: 'Apr', revenue: 50000 },
  { month: 'May', revenue: 52000 },
  { month: 'Jun', revenue: 53000 },
];

const FinancePage = () => {
  return (
    <div className="finance-page">
      <h1 className="finance-title">Finance & Payroll Dashboard</h1>
      <div className="finance-content">
        <div className="left-column">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00f2fe" />
                    <stop offset="100%" stopColor="#ff8c00" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#revenueGradient)"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="right-column">
          <div className="ai-insights">
            <h2 className="insights-title">AI Financial Insights</h2>
            <div className="orb-container">
              <div className="ai-orb" />
            </div>
            <p className="insights-text">
              Based on your current revenue and payroll data, our AI recommends reducing operating costs by <strong>5%</strong> to improve profitability. Additionally, consider optimizing your tax strategy to maximize deductions.
            </p>
            <div className="ai-actions">
              <button className="ai-insight-btn">Approve Recommendation</button>
              <button className="ai-insight-btn secondary">View Detailed Insights</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancePage;