import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { listCrmLeads, updateCrmLead } from '../../api/leadsApi';
import './Marketplace.css';

const MarketplaceView = () => {
  const [leads, setLeads] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ city: '', min: '', max: '' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [matchedBuyers, setMatchedBuyers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      let allLeads = [];
      try {
        const resLeads = await listCrmLeads();
        allLeads = Array.isArray(resLeads.data)
          ? resLeads.data
          : resLeads.data?.results || [];
      } catch {
        allLeads = [];
      }

      const underContract = allLeads.filter((lead) =>
        lead.status === 'scheduled' ||
        lead.deal_stage === 'under_contract' ||
        lead.attributes?.deal_stage === 'under_contract'
      );
      setLeads(underContract);
      setFiltered(underContract);

      try {
        const resBuyers = await api.get('/buyers/');
        const allBuyers = Array.isArray(resBuyers.data)
          ? resBuyers.data
          : resBuyers.data?.results || [];
        setBuyers(allBuyers);
      } catch {
        setBuyers([]);
      }
    };
    fetchData();
  }, []);

  const applyFilters = () => {
    let result = [...leads];
    if (filters.city) result = result.filter(l => l.city?.toLowerCase().includes(filters.city.toLowerCase()));
    if (filters.min) result = result.filter(l => l.estimated_price >= Number(filters.min));
    if (filters.max) result = result.filter(l => l.estimated_price <= Number(filters.max));
    setFiltered(result);
  };

  const getMatchScore = (lead, buyer) => {
    let score = 0;
    if (buyer?.price_min <= lead.estimated_price && buyer?.price_max >= lead.estimated_price) score += 40;
    if (buyer?.cities?.includes(lead.city)) score += 30;
    if (buyer?.type_preferences?.includes(lead.type)) score += 30;
    return score;
  };

  const handleViewMatches = (lead) => {
    const matches = buyers.map(buyer => ({
      ...buyer,
      score: getMatchScore(lead, buyer),
    })).sort((a, b) => b.score - a.score);
    setSelectedLead(lead);
    setMatchedBuyers(matches);
  };

  const markAsClosed = async (leadId) => {
    await updateCrmLead(leadId, { status: 'closed' });
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setFiltered(prev => prev.filter(l => l.id !== leadId));
  };

  return (
    <div className="marketplace">
      <h1>Under Contract Marketplace</h1>

      <div className="filters">
        <input placeholder="City" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} />
        <input placeholder="Min $" type="number" value={filters.min} onChange={e => setFilters({ ...filters, min: e.target.value })} />
        <input placeholder="Max $" type="number" value={filters.max} onChange={e => setFilters({ ...filters, max: e.target.value })} />
        <button onClick={applyFilters}>Apply Filters</button>
      </div>

      <div className="property-grid">
        {filtered.map(lead => (
          <div key={lead.id} className="property-card">
            <h3>{lead.name}</h3>
            <p>{lead.address}</p>
            <p>Price: ${lead.estimated_price}</p>
            <div className="tags">
              <span>{lead.city}</span>
              <span>Status: {lead.status}</span>
            </div>
            <div className="card-actions">
              <button onClick={() => handleViewMatches(lead)}>👥 Match Buyers</button>
              <button onClick={() => markAsClosed(lead.id)}>✅ Mark as Closed</button>
            </div>
          </div>
        ))}
      </div>

      {/* === Modal for Buyer Matches === */}
      {selectedLead && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Top Buyer Matches for {selectedLead.name}</h2>
            <ul>
              {matchedBuyers.map(b => (
                <li key={b.id}>
                  {b.name} - Score: <strong>{b.score}</strong> - Looking in {b.cities?.join(', ')}
                </li>
              ))}
            </ul>
            <button onClick={() => setSelectedLead(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
