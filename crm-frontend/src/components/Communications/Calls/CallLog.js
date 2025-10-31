// src/components/Communication/CallLog.js
import React from 'react';
import './CallLog.css';

const CallLog = ({ callLog, onRemoveCall, onMarkAsHandled, onCallBack }) => {
  return (
    <div className="call-log-card">
      <h3 className="call-log-title">Call Log</h3>
      {callLog.length === 0 ? (
        <p className="no-calls">No calls recorded yet.</p>
      ) : (
        <ul className="call-log-list">
          {callLog.map((record, index) => (
            <li key={index} className="call-record" onClick={() => onCallBack(index)}>
              <div className="record-details">
                <span className="record-number">{record.number}</span>
                <span className="record-time">{record.time}</span>
              </div>
              <div className="record-status">{record.status}</div>
              <div className="record-actions">
                <button
                  className="call-back-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCallBack(index);
                  }}
                >
                  Call Back
                </button>
                <button
                  className="mark-handled-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsHandled(index);
                  }}
                >
                  Mark as Handled
                </button>
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCall(index);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CallLog;