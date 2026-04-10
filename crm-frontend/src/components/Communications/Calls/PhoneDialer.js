import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchCallLogs,
  startBrowserOutboundCall,
} from '../../../api/communications';
import './PhoneDialer.css';

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const cleanDigits = (value) => String(value || '').replace(/\D+/g, '');

const toE164 = (value) => {
  const digits = cleanDigits(value);
  if (!digits) return '';
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return '';
};

const toLabel = (value) => {
  const raw = String(value || '').trim();
  return raw ? raw.replace(/_/g, ' ') : 'unknown';
};

const formatTime = (iso) => {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
};

const PhoneDialer = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [callLog, setCallLog] = useState([]);

  const loadCalls = async () => {
    try {
      const data = await fetchCallLogs({ limit: 25 });
      setCallLog(toRows(data));
    } catch {
      setCallLog([]);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCalls = callLog.filter((row) => {
      const date = new Date(row?.created_at || row?.started_at || row?.timestamp || 0);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today;
    }).length;
    const voicemails = callLog.filter((row) =>
      String(row?.outcome || row?.status || '').toLowerCase().includes('voicemail')
    ).length;
    const missedCalls = callLog.filter((row) =>
      ['no_answer', 'missed', 'failed'].includes(
        String(row?.outcome || row?.status || '').toLowerCase()
      )
    ).length;
    return { todayCalls, voicemails, missedCalls };
  }, [callLog]);

  const handleCall = async () => {
    const to = toE164(phoneNumber);
    const from = toE164(fromNumber);

    if (!to) {
      setError('Enter a valid destination number.');
      return;
    }
    if (!from) {
      setError('Enter a valid caller ID number.');
      return;
    }

    setLoading(true);
    setError('');
    setCallStatus('');

    try {
      const data = await startBrowserOutboundCall({
        to_number: to,
        from_number: from,
      });
      setCallStatus(`Call initiated${data?.call_sid ? ` (${data.call_sid})` : ''}`);
      setPhoneNumber('');
      await loadCalls();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Error initiating call.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallBack = (record) => {
    const next = record?.to_number || record?.counterparty_number || '';
    setPhoneNumber(next);
  };

  return (
    <div className="phone-dialer-container">
      <div className="dialer-card">
        <h2 className="dialer-title">Phone Dialer</h2>
        <div className="dialer-input">
          <input
            type="tel"
            placeholder="From (caller ID)"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            className="phone-input"
          />
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
        {callStatus ? <div className="status-message">{callStatus}</div> : null}
        {error ? <div className="error-message">{error}</div> : null}
      </div>

      <div className="phone-stats-row">
        <div className="phone-stat-block">
          <div className="stat-count count-new">{stats.todayCalls}</div>
          <div className="stat-label">Today's Calls</div>
        </div>
        <div className="phone-stat-block">
          <div className="stat-count count-qualified">{stats.voicemails}</div>
          <div className="stat-label">Voicemails</div>
        </div>
        <div className="phone-stat-block">
          <div className="stat-count count-proposed">{stats.missedCalls}</div>
          <div className="stat-label">Missed Calls</div>
        </div>
      </div>

      <div className="call-log">
        <h3 className="call-log-title">Call Log</h3>
        {callLog.length === 0 ? (
          <p className="no-records">No calls recorded yet.</p>
        ) : (
          <ul className="call-log-list">
            {callLog.map((record, index) => (
              <li key={record?.call_sid || index} className="call-record" onClick={() => handleCallBack(record)}>
                <div className="record-details">
                  <span className="record-number">
                    {record?.to_number || record?.counterparty_number || 'Unknown number'}
                  </span>
                  <span className="record-time">
                    {formatTime(record?.created_at || record?.started_at || record?.timestamp)}
                  </span>
                </div>
                <div className="record-status">{toLabel(record?.outcome || record?.status)}</div>
                <button
                  className="call-back-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCallBack(record);
                  }}
                >
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
