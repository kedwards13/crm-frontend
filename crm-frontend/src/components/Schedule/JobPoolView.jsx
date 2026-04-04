import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useLoadScript,
} from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import {
  listServicePlans,
  listSchedules,
  listServiceTypes,
  listTechnicians,
  getJobPoolGeo,
} from '../../api/schedulingApi';
import './JobPoolView.css';

/* ── Helpers ── */

function monthBounds(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // last day
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), label: start.toLocaleString('default', { month: 'long', year: 'numeric' }) };
}

function formatFrequency(days) {
  if (!days || days <= 0) return '--';
  if (days <= 7) return 'Weekly';
  if (days >= 13 && days <= 16) return 'Bi-weekly';
  if (days >= 28 && days <= 32) return 'Monthly';
  if (days >= 56 && days <= 62) return 'Bi-monthly';
  if (days >= 85 && days <= 95) return 'Quarterly';
  if (days >= 170 && days <= 190) return 'Semi-annual';
  if (days >= 350 && days <= 380) return 'Annual';
  return `Every ${days}d`;
}

function classifyJob(plan, scheduleIndex, monthStart, monthEnd, today) {
  const key = `${plan.customer || plan.customer_id}::${plan.service_type || plan.service_type_id}`;
  if (scheduleIndex.has(key)) return 'scheduled';
  const due = plan.next_service_date;
  if (due && due < today && due <= monthEnd) return 'overdue';
  return 'due';
}

function buildScheduleIndex(schedules) {
  const idx = new Set();
  for (const s of schedules) {
    const custKey = s.customer || s.customer_id || '';
    const svcKey = s.service_type || s.service_type_id || '';
    if (custKey && svcKey) idx.add(`${custKey}::${svcKey}`);
    // Also index by customer name + service type name if available
    if (s.customer_name && s.service_type_name) {
      idx.add(`${s.customer_name}::${s.service_type_name}`);
    }
  }
  return idx;
}

const STATUS_LABELS = { scheduled: 'Scheduled', due: 'Due', overdue: 'Overdue' };
const STATUS_ALL = 'all';

/* ── Component ── */

export default function JobPoolView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [sortCol, setSortCol] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');
  const [showMap, setShowMap] = useState(false);
  const [geoJobs, setGeoJobs] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const { start: monthStart, end: monthEnd, label: monthLabel } = useMemo(
    () => monthBounds(year, month), [year, month]
  );

  /* ── Fetch data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, schedRes, stRes, techRes] = await Promise.all([
        listServicePlans({ page_size: 500, status: 'active' }),
        listSchedules({ page_size: 500, scheduled_start__gte: monthStart, scheduled_start__lte: monthEnd }),
        listServiceTypes({ page_size: 100 }),
        listTechnicians({ page_size: 50 }),
      ]);
      setPlans(plansRes.data?.results || plansRes.data || []);
      setSchedules(schedRes.data?.results || schedRes.data || []);
      setServiceTypes(stRes.data?.results || stRes.data || []);
      setTechnicians(techRes.data?.results || techRes.data || []);
    } catch (err) {
      console.error('[JobPoolView] fetch error', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch geo data when map is shown
  useEffect(() => {
    if (!showMap) return;
    let cancelled = false;
    setGeoLoading(true);
    const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;
    getJobPoolGeo(monthParam)
      .then(({ data }) => { if (!cancelled) setGeoJobs(data?.jobs || []); })
      .catch(() => { if (!cancelled) setGeoJobs([]); })
      .finally(() => { if (!cancelled) setGeoLoading(false); });
    return () => { cancelled = true; };
  }, [showMap, year, month]);

  /* ── Lookup maps ── */
  const svcTypeMap = useMemo(() => {
    const m = {};
    for (const st of serviceTypes) { m[st.id] = st; }
    return m;
  }, [serviceTypes]);

  const techMap = useMemo(() => {
    const m = {};
    for (const t of technicians) { m[t.id] = t; }
    return m;
  }, [technicians]);

  /* ── Build job list ── */
  const scheduleIndex = useMemo(() => buildScheduleIndex(schedules), [schedules]);
  const todayStr = today.toISOString().slice(0, 10);

  const jobs = useMemo(() => {
    return plans.map((plan) => {
      const status = classifyJob(plan, scheduleIndex, monthStart, monthEnd, todayStr);
      const svcType = svcTypeMap[plan.service_type_id || plan.service_type] || {};
      const tech = plan.preferred_technician_id ? techMap[plan.preferred_technician_id] : null;
      return {
        id: plan.id,
        customerName: plan.customer_name || plan.customer || '--',
        serviceName: plan.plan_name || svcType.name || plan.service_type_name || '--',
        dueDate: plan.next_service_date || '--',
        frequency: formatFrequency(plan.expected_interval_days),
        preferredTech: tech ? (tech.name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim()) : (plan.preferred_technician_name || '--'),
        status,
        raw: plan,
      };
    });
  }, [plans, scheduleIndex, monthStart, monthEnd, todayStr, svcTypeMap, techMap]);

  /* ── Filter + sort ── */
  const filtered = useMemo(() => {
    let list = jobs;

    if (statusFilter !== STATUS_ALL) {
      list = list.filter((j) => j.status === statusFilter);
    }
    if (serviceTypeFilter) {
      list = list.filter((j) => {
        const stId = j.raw.service_type_id || j.raw.service_type;
        return String(stId) === serviceTypeFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) => j.customerName.toLowerCase().includes(q));
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'customer': va = a.customerName; vb = b.customerName; break;
        case 'service': va = a.serviceName; vb = b.serviceName; break;
        case 'due_date': va = a.dueDate; vb = b.dueDate; break;
        case 'frequency': va = a.frequency; vb = b.frequency; break;
        case 'tech': va = a.preferredTech; vb = b.preferredTech; break;
        case 'status': {
          const order = { overdue: 0, due: 1, scheduled: 2 };
          va = order[a.status] ?? 1;
          vb = order[b.status] ?? 1;
          return (va - vb) * dir;
        }
        default: va = a.dueDate; vb = b.dueDate;
      }
      if (va === vb) return 0;
      if (va === '--') return 1;
      if (vb === '--') return -1;
      return va < vb ? -dir : dir;
    });

    return list;
  }, [jobs, statusFilter, serviceTypeFilter, search, sortCol, sortDir]);

  /* ── Counts ── */
  const counts = useMemo(() => {
    const c = { total: jobs.length, scheduled: 0, due: 0, overdue: 0 };
    for (const j of jobs) { c[j.status] = (c[j.status] || 0) + 1; }
    return c;
  }, [jobs]);

  /* ── Month nav ── */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  /* ── Sort handler ── */
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return null;
    return <span className="jp-sort-arrow">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  /* ── Render ── */
  return (
    <div className="jp-shell">
      {/* Header with month nav */}
      <div className="jp-header">
        <div className="jp-header-left">
          <button className="jp-nav-btn" onClick={prevMonth} title="Previous month">&larr;</button>
          <span className="jp-month-label">{monthLabel}</span>
          <button className="jp-nav-btn" onClick={nextMonth} title="Next month">&rarr;</button>
        </div>
        <div className="jp-header-right">
          <button
            className={`jp-map-toggle ${showMap ? 'jp-map-toggle-active' : ''}`}
            onClick={() => setShowMap((v) => !v)}
            title={showMap ? 'Hide map' : 'Show map'}
          >
            {showMap ? 'Table' : 'Map'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-sub)', fontFamily: 'monospace' }}>
            {filtered.length} of {counts.total} jobs
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="jp-filters">
        <input
          className="jp-search"
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="jp-select"
          value={serviceTypeFilter}
          onChange={(e) => setServiceTypeFilter(e.target.value)}
        >
          <option value="">All services</option>
          {serviceTypes.map((st) => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </select>
        <div className="jp-status-pills">
          {[STATUS_ALL, 'scheduled', 'due', 'overdue'].map((s) => (
            <button
              key={s}
              className={`jp-pill ${statusFilter === s ? 'jp-pill-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === STATUS_ALL ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="jp-stats">
        <span>Total: <b>{counts.total}</b></span>
        <span><span className="jp-stat-dot jp-stat-dot-green" /> Scheduled: <b>{counts.scheduled}</b></span>
        <span><span className="jp-stat-dot jp-stat-dot-amber" /> Due: <b>{counts.due}</b></span>
        <span><span className="jp-stat-dot jp-stat-dot-red" /> Overdue: <b>{counts.overdue}</b></span>
      </div>

      {/* Error */}
      {error && (
        <div className="jp-error">
          <span>Failed to load job pool: {error}</span>
          <button className="jp-link" onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* Map */}
      {showMap && (
        <JobPoolMap jobs={geoJobs} loading={geoLoading} todayStr={todayStr} />
      )}

      {/* Table */}
      {loading ? (
        <div className="jp-loading">
          <span className="jp-spin">&#9696;</span> Loading job pool...
        </div>
      ) : (
        <div className="jp-table-wrap">
          {filtered.length === 0 ? (
            <div className="jp-empty">
              <div className="jp-empty-title">No jobs found</div>
              <div>
                {jobs.length === 0
                  ? 'No active service plans for this period.'
                  : 'Try adjusting your filters.'}
              </div>
            </div>
          ) : (
            <table className="jp-table">
              <thead>
                <tr>
                  <th className={sortCol === 'customer' ? 'jp-th-active' : ''} onClick={() => handleSort('customer')}>
                    Customer {sortArrow('customer')}
                  </th>
                  <th className={sortCol === 'service' ? 'jp-th-active' : ''} onClick={() => handleSort('service')}>
                    Service {sortArrow('service')}
                  </th>
                  <th className={sortCol === 'due_date' ? 'jp-th-active' : ''} onClick={() => handleSort('due_date')}>
                    Due Date {sortArrow('due_date')}
                  </th>
                  <th className={sortCol === 'frequency' ? 'jp-th-active' : ''} onClick={() => handleSort('frequency')}>
                    Frequency {sortArrow('frequency')}
                  </th>
                  <th className={sortCol === 'tech' ? 'jp-th-active' : ''} onClick={() => handleSort('tech')}>
                    Pref. Tech {sortArrow('tech')}
                  </th>
                  <th className={sortCol === 'status' ? 'jp-th-active' : ''} onClick={() => handleSort('status')}>
                    Status {sortArrow('status')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id}>
                    <td className="jp-col-customer" title={job.customerName}>{job.customerName}</td>
                    <td className="jp-col-service" title={job.serviceName}>{job.serviceName}</td>
                    <td className="jp-col-date">{job.dueDate}</td>
                    <td className="jp-col-freq">{job.frequency}</td>
                    <td className="jp-col-tech">{job.preferredTech}</td>
                    <td>
                      <span className={`jp-badge jp-badge-${job.status}`}>
                        {STATUS_LABELS[job.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="jp-link"
                        onClick={() => {
                          /* Future: navigate to plan detail or open side panel */
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   JOB POOL MAP
   ���═════════════════════════��════════════════════════════════════ */

const MAP_CONTAINER = { width: '100%', height: '400px' };
const DEFAULT_CENTER = { lat: 30.3, lng: -97.7 };

function markerColor(job, todayStr) {
  if (job.due_date && job.due_date < todayStr) return '#ef4444'; // red — overdue
  if (job.source === 'service_plan') return '#f59e0b'; // amber — due but unscheduled
  return '#22c55e'; // green
}

function markerIcon(color) {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 1.5,
    scale: 1.4,
    anchor: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Point(12, 22) : undefined,
  };
}

function JobPoolMap({ jobs, loading, todayStr }) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || 'missing-key',
  });

  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const markersRef = useRef([]);
  const [activeJob, setActiveJob] = useState(null);

  const validJobs = useMemo(
    () => jobs.filter((j) => j.lat && j.lng && j.lat !== 0 && j.lng !== 0),
    [jobs]
  );

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Create/update markers + clusterer when data changes
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;

    // Clear old markers
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];
    if (clustererRef.current) { clustererRef.current.clearMarkers(); clustererRef.current = null; }

    if (validJobs.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    const newMarkers = validJobs.map((job) => {
      const color = markerColor(job, todayStr);
      const pos = { lat: job.lat, lng: job.lng };
      bounds.extend(pos);
      const marker = new window.google.maps.Marker({
        position: pos,
        icon: markerIcon(color),
        title: job.customer_name,
      });
      marker.addListener('click', () => setActiveJob(job));
      return marker;
    });
    markersRef.current = newMarkers;

    clustererRef.current = new MarkerClusterer({ map, markers: newMarkers });

    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    if (validJobs.length === 1) map.setZoom(14);
  }, [isLoaded, validJobs, todayStr]);

  if (!apiKey) return <div className="jp-map-msg">Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the map.</div>;
  if (loadError) return <div className="jp-map-msg">Unable to load Google Maps.</div>;
  if (!isLoaded || loading) return <div className="jp-map-msg">Loading map...</div>;

  return (
    <div className="jp-map-wrap">
      <div className="jp-map-legend">
        <span><span className="jp-legend-dot" style={{ background: '#ef4444' }} /> Overdue</span>
        <span><span className="jp-legend-dot" style={{ background: '#f59e0b' }} /> Due</span>
        <span><span className="jp-legend-dot" style={{ background: '#22c55e' }} /> Scheduled</span>
        <span className="jp-text-muted">{validJobs.length} of {jobs.length} with coordinates</span>
      </div>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER}
        center={DEFAULT_CENTER}
        zoom={10}
        onLoad={onMapLoad}
        options={{ disableDefaultUI: false, zoomControl: true, streetViewControl: false, mapTypeControl: false }}
      >
        {activeJob && activeJob.lat && (
          <InfoWindow
            position={{ lat: activeJob.lat, lng: activeJob.lng }}
            onCloseClick={() => setActiveJob(null)}
          >
            <div style={{ maxWidth: 220, fontFamily: 'var(--font-sans)', fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{activeJob.customer_name}</div>
              <div style={{ color: '#64748b' }}>{activeJob.service_type}</div>
              {activeJob.due_date && <div style={{ color: '#64748b' }}>Due: {activeJob.due_date}</div>}
              {activeJob.preferred_tech && <div style={{ color: '#64748b' }}>Pref tech: {activeJob.preferred_tech}</div>}
              <div style={{ color: '#64748b' }}>{activeJob.duration}m</div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
