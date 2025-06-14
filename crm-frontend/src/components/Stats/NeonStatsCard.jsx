// src/components/NeonStatsCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './NeonStatsCards.css';

const NeonStatsCard = ({ label, value, gradientClass, onClick }) => {
  return (
    <div className="neon-stats-card card" onClick={onClick}>
      <h3 className="neon-stats-title">{label}</h3>
      <div className="neon-stats-content">
        {/* We apply the dynamic neon gradient via gradientClass */}
        <div className={`neon-stats-value ${gradientClass}`}>{value}</div>
      </div>
    </div>
  );
};

NeonStatsCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  gradientClass: PropTypes.string,  // e.g. "count-new" / "count-qualified" etc
  onClick: PropTypes.func,
};

NeonStatsCard.defaultProps = {
  gradientClass: '',
  onClick: () => {},
};

export default NeonStatsCard;