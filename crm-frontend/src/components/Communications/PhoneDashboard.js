import React, { useState, useEffect } from 'react';
import './PhoneDialer.css';

const PhoneDialer = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // For demo, store past calls in local state (later you’d fetch this from your backend)
  const [callLog, setCallLog] = useState([]);

  const handleCall = async () => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError('');
    setCallStatus('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:808/api/comm/inbound-call/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      const data = await response.json();
      setCallStatus(`Call initiated. Call SID: ${data.call_sid}`);
      // Add call to log (simulate record)
      setCallLog(prev => ([
        { number: phoneNumber, time: new Date().toLocaleTimeString(), status: 'Initiated' },
        ...prev,
      ]));
    } catch (err) {
      console.error("Error making call:", err);
      setError("Error initiating call. Please try again.");
    } finally {
      setLoading(false);
      setPhoneNumber('');
    }
  };

  // Simulate fetching voicemail and recommended tasks on mount
  useEffect(() => {
    // In a real implementation, fetch past calls/voicemails/tasks from your API.
    const sampleRecords = [
      { number: '(402) 625-3446', time: '10:15 AM', status: 'Voicemail Recorded' },
      { number: '+15551234567', time: '09:30 AM', status: 'Call Back Required' }
    ];
    setCallLog(sampleRecords);
  }, []);

  // Handle clicking a call record (e.g., to initiate a callback)
  const handleCallBack = (record) => {
    console.log(`Calling back ${record.number}`);
    // You can reuse the call functionality here
    // For example, set phoneNumber to record.number and trigger handleCall() or open a modal with call details
  };

  return (
    <div className="phone-dialer">
      <h2 className="dialer-title">Phone Dialer</h2>
      <div className="dialer-input">
        <input
          type="tel"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="phone-input"
        />
        <button onClick={handleCall} className="action-button" disabled={loading}>
          {loading ? 'Calling...' : 'Call'}
        </button>
      </div>
      {callStatus && <div className="status-message">{callStatus}</div>}
      {error && <div className="error-message">{error}</div>}
      <div className="call-log">
        <h3 className="call-log-title">Call Log</h3>
        {callLog.length === 0 ? (
          <p className="no-records">No calls recorded yet.</p>
        ) : (
          <ul className="call-log-list">
            {callLog.map((record, index) => (
              <li key={index} className="call-record" onClick={() => handleCallBack(record)}>
                <div className="record-details">
                  <span className="record-number">{record.number}</span>
                  <span className="record-time">{record.time}</span>
                </div>
                <div className="record-status">
                  {record.status}
                </div>
                <button className="call-back-btn" onClick={(e) => {
                  e.stopPropagation();
                  handleCallBack(record);
                }}>
                  Call Back
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PhoneDialer;