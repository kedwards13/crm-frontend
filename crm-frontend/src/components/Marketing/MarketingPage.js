// src/components/Marketing/MarketingPage.js

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Campaigns from './Campaigns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import './MarketingPage.css';

// Example data
const socialMetricsData = [
  { platform: 'Facebook', likes: 1200, shares: 300, comments: 150 },
  { platform: 'Instagram', likes: 2000, shares: 400, comments: 250 },
  { platform: 'Twitter', likes: 800, shares: 200, comments: 100 },
  { platform: 'LinkedIn', likes: 600, shares: 150, comments: 80 },
];

const adsPerformanceData = [
  { name: 'Impressions', value: 50000 },
  { name: 'Clicks', value: 12000 },
  { name: 'Conversions', value: 800 },
];

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const MarketingDashboard = () => {
  return (
    <div className="marketing-page">
      <h1 className="marketing-title">Marketing Dashboard</h1>

      {/* Social Media Metrics */}
      <div className="marketing-section">
        <h2 className="section-subtitle">Social Media Metrics</h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={socialMetricsData}>
              {/* DEFINITIONS for gradients & glow filters */}
              <defs>
                {/* Likes Gradient */}
                <linearGradient id="likesGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f2fe" />
                  <stop offset="100%" stopColor="#ff8c00" />
                </linearGradient>
                {/* Shares Gradient */}
                <linearGradient id="sharesGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9c49ff" />
                  <stop offset="100%" stopColor="#ff4397" />
                </linearGradient>
                {/* Comments Gradient */}
                <linearGradient id="commentsGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#54ff00" />
                  <stop offset="100%" stopColor="#ffa500" />
                </linearGradient>
                {/* Glow Filter */}
                <filter id="glowShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="4"
                    floodColor="rgba(255,255,255,0.3)"
                  />
                </filter>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="platform" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2a2a3a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ color: '#fff', marginBottom: 10 }}
              />

              <Line
                type="monotone"
                dataKey="likes"
                stroke="url(#likesGradient)"
                strokeWidth={3}
                filter="url(#glowShadow)"
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="shares"
                stroke="url(#sharesGradient)"
                strokeWidth={3}
                filter="url(#glowShadow)"
              />
              <Line
                type="monotone"
                dataKey="comments"
                stroke="url(#commentsGradient)"
                strokeWidth={3}
                filter="url(#glowShadow)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ads Performance */}
      <div className="marketing-section">
        <h2 className="section-subtitle">Ads Performance</h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={adsPerformanceData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {adsPerformanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2a2a3a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      <div className="marketing-section ai-insights">
        <h2 className="section-subtitle">AI Insights &amp; Content Creation</h2>
        <div className="orb-container">
          <div className="ai-orb" />
        </div>
        <p>
          Our AI system has analyzed your recent campaigns and recommends boosting
          engagement on Instagram by increasing ad spend and using interactive content
          formats. Explore new content ideas generated by our AI to maximize reach
          and conversion.
        </p>
        <button className="ai-action-btn">Generate AI Content Ideas</button>
      </div>
    </div>
  );
};

const Placeholder = ({ title }) => (
  <div className="marketing-page">
    <h1 className="marketing-title">{title}</h1>
    <p className="muted">This section is ready for the next build-out.</p>
  </div>
);

const MarketingPage = () => (
  <Routes>
    <Route index element={<MarketingDashboard />} />
    <Route path="campaigns" element={<Campaigns />} />
    <Route path="automations" element={<Placeholder title="Automations" />} />
    <Route path="segments" element={<Placeholder title="Segments" />} />
    <Route path="forms" element={<Placeholder title="Forms & Pages" />} />
    <Route path="ai" element={<Placeholder title="AI Studio" />} />
    <Route path="*" element={<MarketingDashboard />} />
  </Routes>
);

export default MarketingPage;
