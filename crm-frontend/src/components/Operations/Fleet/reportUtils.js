// src/components/Operations/Fleet/reportUtils.js
import useFleetApi from './useFleetApi';
/* ───────────────────────────────
 * Date & time helpers
 * ─────────────────────────────── */

export const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);

export const isValidDate = (d) => d instanceof Date && !isNaN(d.valueOf());

export const startOfDay = (d) => {
  const x = toDate(d); if (!isValidDate(x)) return null;
  x.setHours(0,0,0,0); return x;
};

export const endOfDay = (d) => {
  const x = toDate(d); if (!isValidDate(x)) return null;
  x.setHours(23,59,59,999); return x;
};

export const daysBetween = (a, b) => {
  const d1 = startOfDay(a), d2 = startOfDay(b);
  if (!isValidDate(d1) || !isValidDate(d2)) return null;
  return Math.round((d2 - d1) / (1000*60*60*24));
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return daysBetween(new Date(), dateStr);
};

export const clampDateRange = (from, to) => {
  const s = startOfDay(from), e = endOfDay(to);
  if (!isValidDate(s) || !isValidDate(e)) return [null, null];
  if (e < s) return [e, e]; // prevent inverted ranges
  return [s, e];
};

export const isoDate = (d) => {
  const x = toDate(d);
  return isValidDate(x) ? x.toISOString().slice(0,10) : '';
};

export const monthKey = (d) => {
  const x = toDate(d);
  if (!isValidDate(x)) return '';
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; // YYYY-MM
};

/* ───────────────────────────────
 * Bucketing, grouping, aggregations
 * ─────────────────────────────── */

export const groupBy = (arr, keyFn) =>
  arr.reduce((m, x) => {
    const k = keyFn(x);
    (m[k] = m[k] || []).push(x);
    return m;
  }, {});

export const indexBy = (arr, keyFn) =>
  arr.reduce((m, x) => ((m[keyFn(x)] = x), m), {});

export const unique = (arr) => Array.from(new Set(arr));

export const sumBy = (arr, numFn) =>
  arr.reduce((s, x) => s + (Number(numFn(x)) || 0), 0);

export const avgBy = (arr, numFn) => {
  if (!arr?.length) return 0;
  return sumBy(arr, numFn) / arr.length;
};

export const bucketByMonth = (arr, dateGetter, mapFn = (x) => x) => {
  const g = groupBy(arr, (x) => monthKey(dateGetter(x)));
  const keys = Object.keys(g).sort(); // chronological
  return keys.map((k) => ({ month: k, items: g[k].map(mapFn) }));
};

export const rollingSum = (values, window = 3) => {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const from = Math.max(0, i - window + 1);
    const slice = values.slice(from, i + 1);
    out.push(slice.reduce((s, v) => s + (Number(v) || 0), 0));
  }
  return out;
};

export const trendPct = (current, previous) => {
  const a = Number(current) || 0;
  const b = Number(previous) || 0;
  if (b === 0) return a === 0 ? 0 : 100;
  return ((a - b) / Math.abs(b)) * 100;
};

/* ───────────────────────────────
 * Sorting & pagination
 * ─────────────────────────────── */

export const sortBy = (arr, selector, dir = 'asc') => {
  const copy = [...arr];
  copy.sort((a, b) => {
    const va = selector(a), vb = selector(b);
    if (va == null && vb == null) return 0;
    if (va == null) return dir === 'asc' ? 1 : -1;
    if (vb == null) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    if (va < vb) return dir === 'asc' ? -1 : 1;
    return 0;
  });
  return copy;
};

export const multiSort = (arr, specs) => {
  // specs: [{ selector: fn, dir: 'asc'|'desc' }, ...]
  const copy = [...arr];
  copy.sort((a, b) => {
    for (const { selector, dir = 'asc' } of specs) {
      const va = selector(a), vb = selector(b);
      if (va == null && vb == null) continue;
      if (va == null) return dir === 'asc' ? 1 : -1;
      if (vb == null) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      if (va < vb) return dir === 'asc' ? -1 : 1;
    }
    return 0;
  });
  return copy;
};

export const paginate = (arr, page = 1, pageSize = 25) => {
  const p = Math.max(1, page);
  const s = Math.max(1, pageSize);
  const offset = (p - 1) * s;
  const items = arr.slice(offset, offset + s);
  return { items, page: p, pageSize: s, total: arr.length, pages: Math.ceil(arr.length / s) };
};

/* ───────────────────────────────
 * Compliance scoring & due logic
 * ─────────────────────────────── */

export const dueTone = (daysOrMiles) => {
  if (daysOrMiles == null) return '';
  if (typeof daysOrMiles === 'number') {
    if (daysOrMiles < 0) return 'bad';   // past due
    if (daysOrMiles <= 30) return 'warn';
  }
  return 'good';
};

export const fmtDays = (d) => {
  if (d == null) return '—';
  return d < 0 ? `${Math.abs(d)} past` : `${d} days`;
};

export const milesDeltaToTone = (milesLeft) => {
  if (milesLeft == null) return '';
  if (milesLeft < 0) return 'bad';
  if (milesLeft <= 500) return 'warn';
  return 'good';
};

/**
 * Build a unified compliance snapshot for a vehicle.
 * Returns: { insuranceDays, registrationDays, serviceDays, serviceMilesLeft, score (0..100) }
 */
export const complianceSnapshot = (vehicle) => {
  const insuranceDays = daysUntil(vehicle?.insurance?.expires_on);
  const registrationDays = daysUntil(vehicle?.registration_expires_on);
  const serviceDays = daysUntil(vehicle?.next_service_due_date);
  const milesLeft = isFinite((vehicle?.next_service_due_miles ?? Infinity) - (vehicle?.odometer ?? 0))
    ? (vehicle.next_service_due_miles - (vehicle.odometer || 0))
    : null;

  // Scoring: simple weights, tune later
  const parts = [
    scoreDays(insuranceDays, 40),
    scoreDays(registrationDays, 30),
    scoreService(serviceDays, milesLeft, 30),
  ];
  const score = Math.max(0, Math.min(100, Math.round(parts.reduce((s, x) => s + x, 0))));

  return {
    insuranceDays,
    registrationDays,
    serviceDays,
    serviceMilesLeft: milesLeft,
    score,
  };
};

const scoreDays = (days, weight) => {
  if (days == null) return weight * 0.6; // unknown → neutral-ish
  if (days < 0) return 0;
  if (days <= 7) return weight * 0.2;
  if (days <= 30) return weight * 0.6;
  return weight; // healthy
};

const scoreService = (days, milesLeft, weight) => {
  // Blend time & mileage halves
  const half = weight / 2;
  const partDays =
    days == null ? half * 0.6 :
    days < 0   ? 0 :
    days <= 7  ? half * 0.2 :
    days <= 30 ? half * 0.6 :
                 half;

  const partMiles =
    milesLeft == null ? half * 0.6 :
    milesLeft < 0     ? 0 :
    milesLeft <= 200  ? half * 0.2 :
    milesLeft <= 800  ? half * 0.6 :
                        half;

  return partDays + partMiles;
};

/* ───────────────────────────────
 * KPI calculators (fleet)
 * ─────────────────────────────── */

export const computeFleetKpis = (vehicles = []) => {
  const total = vehicles.length;
  const active = vehicles.filter(v => v.status === 'active').length;
  const inService = vehicles.filter(v => v.status === 'in_service').length;
  const retired = vehicles.filter(v => v.status === 'retired').length;

  const overdueMaint = vehicles.filter(v => {
    const milesPast = (v.odometer ?? 0) - (v.next_service_due_miles ?? Infinity);
    const datePast  = daysUntil(v.next_service_due_date) ?? Infinity;
    return milesPast >= 0 || datePast < 0;
  }).length;

  const expiringInsurance = vehicles.filter(v => {
    const d = daysUntil(v?.insurance?.expires_on);
    return d != null && d <= 30;
  }).length;

  return {
    total,
    active,
    inService,
    retired,
    overdueMaint,
    expiringInsurance,
  };
};

/* ───────────────────────────────
 * Export helpers
 * ─────────────────────────────── */

export const csvFromRows = (rows) => {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
};

export const downloadCsv = (rows, name = 'export') => {
  const csv = csvFromRows(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadJson = (data, name = 'export') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ───────────────────────────────
 * Formatters & units
 * ─────────────────────────────── */

export const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
};

export const fmtCurrency = (n, currency = 'USD') => {
  const val = Number(n);
  if (isNaN(val)) return '—';
  return val.toLocaleString(undefined, { style:'currency', currency, maximumFractionDigits:2 });
};

export const fmtMiles = (n) => {
  const val = Number(n);
  if (isNaN(val)) return '—';
  return `${val.toLocaleString()} mi`;
};

export const fmtPercent = (n, digits = 1) => {
  const val = Number(n);
  if (isNaN(val)) return '—';
  return `${val.toFixed(digits)}%`;
};

/* ───────────────────────────────
 * Guard/utility predicates
 * ─────────────────────────────── */

export const notEmpty = (x) => x != null && x !== '';
export const hasText = (s) => typeof s === 'string' && s.trim().length > 0;

/* ───────────────────────────────
 * Example transformers used by reports
 * ─────────────────────────────── */

/** Build a cost table from maintenance tasks (status === 'done'). */
export const buildCostTable = (tasks = [], vehicles = []) => {
  const vIndex = indexBy(vehicles, v => v.id);
  const done = tasks.filter(t => String(t.status).toLowerCase() === 'done' && t.cost != null);
  const map = new Map();
  for (const t of done) {
    const v = vIndex[t.vehicle_id];
    const key = t.vehicle_id;
    const prev = map.get(key) || { vehicle_id: key, unit_code: v?.unit_code || '—', make: v?.make, model: v?.model, total: 0 };
    prev.total += Number(t.cost) || 0;
    map.set(key, prev);
  }
  return sortBy([...map.values()], (r) => r.total, 'desc');
};

/** Build a compliance table from vehicles using complianceSnapshot(). */
export const buildComplianceTable = (vehicles = []) =>
  vehicles.map(v => {
    const c = complianceSnapshot(v);
    return {
      vehicle_id: v.id,
      unit_code: v.unit_code || '—',
      insurance_days: c.insuranceDays,
      registration_days: c.registrationDays,
      service_days: c.serviceDays,
      service_miles_left: c.serviceMilesLeft,
      score: c.score,
    };
  }).sort((a,b) => a.score - b.score); // worst first