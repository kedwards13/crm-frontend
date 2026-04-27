import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getSyncStatus, getSyncIssues, retrySyncItems } from '../../api/salesApi';
import { Button } from '../../components/ui/button';
import { getUserRole } from '../../helpers/tenantHelpers';
import './Sales.css';

const STATUS_META = {
  synced:  { label: 'Synced',  color: 'var(--success)',    bg: 'var(--success-dim, rgba(50,206,150,.12))' },
  ready:   { label: 'Ready',   color: 'var(--accent)',     bg: 'var(--accent-dim)' },
  pending: { label: 'Pending', color: 'var(--text-sub)',   bg: 'var(--bg-panel)' },
  blocked: { label: 'Blocked', color: 'var(--warning)',    bg: 'var(--warning-dim, rgba(233,190,109,.12))' },
  failed:  { label: 'Failed',  color: 'var(--destructive)', bg: 'rgba(240,123,145,.12)' },
};

const MANAGER_ROLES = ['admin', 'owner', 'manager', 'Admin', 'Manager', 'Owner'];

export default function SyncStatusPage() {
  const [counts, setCounts] = useState(null);
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState({});
  const [retryingBulk, setRetryingBulk] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);

  const userRole = getUserRole('Member');
  const canRetry = MANAGER_ROLES.includes(userRole);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, issuesRes] = await Promise.all([
        getSyncStatus(),
        getSyncIssues({ status: filter, limit: 100 }),
      ]);
      setCounts(statusRes?.data?.counts || null);
      setIssues(issuesRes?.data?.items || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('You do not have permission to view FieldRoutes sync data, or this tenant is not configured for FieldRoutes.');
      } else {
        setError('Failed to load sync data.');
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Retry single ──
  const handleRetry = async (appointmentId) => {
    setRetrying((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      await retrySyncItems([appointmentId]);
      toast.success('Retry queued');
      fetchData();
    } catch (err) {
      if (err?.response?.status === 403) {
        toast.error('Permission denied — manager access required');
      } else {
        toast.error('Retry failed');
      }
    } finally {
      setRetrying((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  // ── Retry bulk ──
  const handleRetrySelected = async () => {
    if (selected.size === 0) return;
    setRetryingBulk(true);
    try {
      await retrySyncItems([...selected]);
      toast.success(`${selected.size} item(s) queued for retry`);
      setSelected(new Set());
      fetchData();
    } catch (err) {
      if (err?.response?.status === 403) {
        toast.error('Permission denied — manager access required');
      } else {
        toast.error('Bulk retry failed');
      }
    } finally {
      setRetryingBulk(false);
    }
  };

  // ── Select toggle ──
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(issues.map((i) => i.appointment_id)));
    }
  };

  if (error) {
    return (
      <div className="sales-page">
        <div className="sales-shell">
          <section className="sales-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ color: 'var(--text-sub)', fontSize: '1rem' }}>{error}</p>
            <Button variant="outline" onClick={fetchData} style={{ marginTop: 16 }}>Retry</Button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="sales-shell">
        <section className="sales-hero">
          <div>
            <p className="sales-eyebrow">FieldRoutes</p>
            <h1>Sync Status</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </section>

        {/* ── Status cards ── */}
        {counts && (
          <div className="sync-counts-row">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div className="sync-count-card" key={key} style={{ '--card-accent': meta.color, '--card-bg': meta.bg }}>
                <span className="sync-count-label">{meta.label}</span>
                <strong className="sync-count-value">{counts[key] ?? 0}</strong>
              </div>
            ))}
            <div className="sync-count-card sync-count-total">
              <span className="sync-count-label">Total</span>
              <strong className="sync-count-value">{counts.total ?? 0}</strong>
            </div>
          </div>
        )}

        {/* ── Issues table ── */}
        <section className="sales-card">
          <div className="sales-section-head">
            <div>
              <h2>Sync Issues</h2>
              <p>First-service appointments with failed or blocked FieldRoutes sync.</p>
            </div>
            <div className="sync-filter-row">
              {['all', 'failed', 'blocked'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`sync-filter-btn${filter === f ? ' is-active' : ''}`}
                  onClick={() => { setFilter(f); setSelected(new Set()); }}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {canRetry && selected.size > 0 && (
            <div className="sync-bulk-bar">
              <span>{selected.size} selected</span>
              <Button variant="outline" size="sm" onClick={handleRetrySelected} loading={retryingBulk} disabled={retryingBulk}>
                Retry Selected
              </Button>
            </div>
          )}

          <div className="sales-table-wrap">
            <table className="sales-table sync-table">
              <thead>
                <tr>
                  {canRetry && (
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={issues.length > 0 && selected.size === issues.length} onChange={toggleSelectAll} />
                    </th>
                  )}
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Appointment</th>
                  <th>Status</th>
                  <th>Last Error</th>
                  <th>Failed At</th>
                  {canRetry && <th style={{ width: 90 }}></th>}
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 && !loading && (
                  <tr>
                    <td colSpan={canRetry ? 8 : 6} className="sync-empty">
                      {filter === 'all' ? 'No sync issues found.' : `No ${filter} items.`}
                    </td>
                  </tr>
                )}
                {issues.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.pending;
                  return (
                    <tr key={item.appointment_id}>
                      {canRetry && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(item.appointment_id)}
                            onChange={() => toggleSelect(item.appointment_id)}
                          />
                        </td>
                      )}
                      <td className="sync-cell-name">{item.customer_name || '—'}</td>
                      <td>{item.service_type || '—'}</td>
                      <td className="sync-cell-mono">
                        {item.appointment_start
                          ? new Date(item.appointment_start).toLocaleDateString()
                          : String(item.appointment_id).slice(0, 8)}
                      </td>
                      <td>
                        <span className="sync-status-chip" style={{ color: meta.color, background: meta.bg }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="sync-cell-error">{item.last_error || '—'}</td>
                      <td className="sync-cell-mono">
                        {item.failed_at ? new Date(item.failed_at).toLocaleString() : '—'}
                      </td>
                      {canRetry && (
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(item.appointment_id)}
                            loading={retrying[item.appointment_id]}
                            disabled={retrying[item.appointment_id]}
                          >
                            Retry
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
