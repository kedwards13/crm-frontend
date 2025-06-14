import React from 'react';

const ContractSteps = ({ step, contract, setStep, totalSteps }) => {
  return (
    <div className="contract-steps">
      <p style={{ color: '#999', marginBottom: '8px' }}>
        Step {step + 1} of {totalSteps}
      </p>
      <div className="progress-bar" style={{
        height: '6px',
        borderRadius: '999px',
        background: '#2e2e2e',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: `${((step + 1) / totalSteps) * 100}%`,
          background: '#0a84ff',
          height: '100%'
        }} />
      </div>
    </div>
  );
};

export default ContractSteps;