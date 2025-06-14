import React from 'react';
import './ContractClauseBuilder.css';

const ContractClauseBuilder = ({ contract, setContract }) => {
  const toggle = field =>
    setContract(prev => ({ ...prev, [field]: !prev[field] }));

  return (
    <div className="clause-builder">
      <h4>Standard Clauses</h4>
      <label><input
        type="checkbox"
        checked={contract.include_inspection_clause}
        onChange={() => toggle('include_inspection_clause')}
      /> Inspection Period</label>
      <label><input
        type="checkbox"
        checked={contract.include_clear_title_clause}
        onChange={() => toggle('include_clear_title_clause')}
      /> Clear Title Requirement</label>
      <label><input
        type="checkbox"
        checked={contract.include_assignment_clause}
        onChange={() => toggle('include_assignment_clause')}
      /> Assignment Allowed</label>
      <label><input
        type="checkbox"
        checked={contract.include_distribution_of_proceeds}
        onChange={() => toggle('include_distribution_of_proceeds')}
      /> Distribution of Proceeds</label>

      <h4 style={{ marginTop: '1rem' }}>Custom Clauses</h4>
      <textarea
        rows={4}
        placeholder="Add any custom terms…"
        value={contract.additional_clauses}
        onChange={e => setContract(prev => ({
          ...prev,
          additional_clauses: e.target.value
        }))}
      />
    </div>
  );
};

export default ContractClauseBuilder;