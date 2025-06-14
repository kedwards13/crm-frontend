// src/components/Customers/CustomersDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NeonStatsCard from '../Stats/NeonStatsCard'; // The new generic card
import './CustomersDashboard.css'; // For additional layout styling
import { useNavigate } from 'react-router-dom';

const CustomersDashboard = ({ token }) => {
  const [metrics, setMetrics] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Example endpoint: /api/customers/metrics
        const response = await axios.get('http://localhost:808/api/customers/metrics', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setMetrics(response.data);
      } catch (err) {
        console.error('Error fetching customer metrics:', err);
      }
    };

    fetchMetrics();
  }, [token]);

  const handleActiveCustomersClick = () => {
    // Navigate to your customer list with a query param or filter for “active”
    navigate('/customers?filter=active');
  };

  const handleAtRiskClick = () => {
    // Navigate to a filtered list for high-cancellation-risk customers
    navigate('/customers?filter=atRisk');
  };

  const handleMonthlyRevClick = () => {
    // Possibly navigate to a revenue breakdown or open a modal
    // Or filter customers by “premium” accounts, etc.
    navigate('/customers?filter=highValue');
  };

  if (!metrics) {
    return <p>Loading metrics...</p>;
  }

  return (
    <div className="customers-dashboard">
      <h2>Customers Dashboard</h2>
      <div className="stats-row">
        <NeonStatsCard
          label="Active Customers"
          value={metrics.activeCustomers}
          gradientClass="count-new"
          onClick={handleActiveCustomersClick}
        />
        <NeonStatsCard
          label="At-Risk Customers"
          value={metrics.atRiskCustomers}
          gradientClass="count-proposed"
          onClick={handleAtRiskClick}
        />
        <NeonStatsCard
          label="Monthly Revenue"
          value={`$${metrics.monthlyRevenue.toLocaleString()}`}
          gradientClass="count-qualified"
          onClick={handleMonthlyRevClick}
        />
      </div>
      {/* You can add more sections, e.g. an AI panel, pipeline, or recent activity if you like. */}
    </div>
  );
};

export default CustomersDashboard;