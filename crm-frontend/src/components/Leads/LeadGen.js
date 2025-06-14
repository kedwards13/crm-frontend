// src/components/Leads/LeadGen.js
import React, { useState } from 'react';
import './LeadGen.css';

const LeadGen = () => {
  // Example state for configuring automated lead generation
  const [industry, setIndustry] = useState('real_estate');
  const [budget, setBudget] = useState('');
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Simulated function to trigger automated lead generation
  const generateLeads = async () => {
    setLoading(true);
    setMessage('');
    // In a real implementation, you'd call an API endpoint that uses OpenAI or other automation tools
    setTimeout(() => {
      // Dummy results for illustration
      setResults([
        { id: 101, name: 'John Doe', phone: '123-456-7890', address: '101 Main St', timeReceived: new Date() },
        { id: 102, name: 'Jane Smith', phone: '987-654-3210', address: '202 Second St', timeReceived: new Date() }
      ]);
      setMessage('Automated lead generation complete.');
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="leadgen-container">
      <h2>Automated Lead Generation</h2>
      <div className="leadgen-config">
        <label>
          Industry:
          <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="real_estate">Real Estate</option>
            <option value="pest_control">Pest Control</option>
            <option value="contractors">Contractors</option>
            {/* Add more industries as needed */}
          </select>
        </label>
        <label>
          Budget:
          <input
            type="text"
            placeholder="Enter budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <label>
          Keywords:
          <input
            type="text"
            placeholder="Enter keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>
        <button onClick={generateLeads} disabled={loading}>
          {loading ? 'Generating Leads...' : 'Generate Leads'}
        </button>
      </div>

      {message && <p className="leadgen-message">{message}</p>}

      {results.length > 0 && (
        <div className="leadgen-results">
          <h3>Generated Leads</h3>
          <div className="leadgen-grid">
            {results.map((lead) => (
              <div key={lead.id} className="leadgen-card">
                <h4>{lead.name}</h4>
                <p><b>Phone:</b> {lead.phone}</p>
                <p><b>Address:</b> {lead.address}</p>
                <p>
                  <b>Received:</b> {new Date(lead.timeReceived).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadGen;