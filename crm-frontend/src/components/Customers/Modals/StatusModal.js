import React from "react";

export default function StatusModal({ options = [], onSelect, onClose }) {
  if (!options.length) return null;

  return (
    <div className="status-popup">
      <div className="status-popup-inner">
        <h3 className="status-title">Update Status</h3>

        <div className="status-options">
          {options.map((status) => (
            <button
              key={status}
              className="status-option"
              onClick={() => onSelect?.(status)}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        <button className="status-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
