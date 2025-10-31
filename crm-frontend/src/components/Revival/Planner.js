import React, { useEffect, useState } from 'react';
import PlanChart from './PlanChart';
import MetricCard from './MetricCard';
import RevivalLeadCard from './RevivalLeadCard';
import AIStrategyCard from './AIStrategyCard';

import './_planner.scss';
import api from '../../api/revivalApi';

const Planner = () => {
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [totalRes, recentRes] = await Promise.all([
        api.getTotalPotentialValue(),
        api.getRecentScans(),
      ]);

      setTotalValue(totalRes.data?.total_potential_value || 0);

      const scans = Array.isArray(recentRes.data)
        ? recentRes.data
        : Array.isArray(recentRes.data?.results)
        ? recentRes.data.results
        : [];

      setRecentScans(scans);
    } catch (err) {
      console.error('🛑 Revival planner fetch error:', err);
      setRecentScans([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="planner-page">
      <div className="planner-header">
        <h2>Revival Planner</h2>
        <p>Overview of scanned quotes, payment tracking, and AI growth forecasts.</p>
      </div>

      {/* Monthly Revenue Projection */}
      <section className="planner-section">
        <h3>Monthly Revenue Projection</h3>
        <PlanChart />
      </section>

      {/* Metrics */}
      <section className="planner-section">
        <h3>Current Metrics</h3>
        <div className="metric-grid">
          <MetricCard label="Quotes Extracted" value={recentScans.length} />
          <MetricCard label="Avg Confidence" value="92%" />
          <MetricCard label="Enriched Leads" value="12" />
          <MetricCard
            label="Estimated Value"
            value={`$${Number(totalValue || 0).toLocaleString()}`}
          />
        </div>
      </section>

      {/* Recent Scans */}
      <section className="planner-section">
        <h3>Recent Scans</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : recentScans.length === 0 ? (
          <div className="empty">No scans yet. Upload a quote to get started.</div>
        ) : (
          <div className="scan-feed">
            {recentScans.map((quote, idx) => (
              <RevivalLeadCard key={quote.id || idx} quote={quote} onSave={fetchData} />
            ))}
          </div>
        )}
      </section>

      {/* AI Strategy Suggestions */}
      <section className="planner-section">
        <AIStrategyCard />
      </section>
    </div>
  );
};

export default Planner;