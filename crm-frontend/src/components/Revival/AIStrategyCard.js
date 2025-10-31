import React from 'react';

const AIStrategyCard = ({ onPress }) => {
  return (
    <div
      onClick={onPress}
      style={{
        padding: 20,
        background: '#eaf5ff',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'center',
        fontWeight: '600',
        color: '#007bff',
      }}
    >
      🔍 View AI Strategy Plan →
    </div>
  );
};

export default AIStrategyCard;