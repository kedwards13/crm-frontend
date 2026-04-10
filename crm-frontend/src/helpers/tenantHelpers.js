// crm-frontend/src/helpers/tenantHelpers.js

/** Normalize arbitrary industry/vertical strings into the registry keys. */
export function normalizeIndustry(raw) {
  // Accept objects or strings gracefully
  const s0 = typeof raw === 'string' ? raw : (raw?.industry || raw?.vertical || raw?.segment || '');
  const s = String(s0 || 'general').trim().toLowerCase().replace(/\s+/g, ' ');

  // Already-normalized keys (idempotent)
  if (['pest_control', 'real_estate', 'wholesaler', 'fitness', 'food_wellness', 'auto', 'landscaping', 'general'].includes(s)) {
    return s;
  }

  // Aliases
  if ([
    'pest', 'pestcontrol', 'pest-control', 'pest control', 'pc',
    'sunpest', 'sun pest', 'sun pest control',
    'home service', 'home services', 'home-service', 'home-services', 'homeservices',
    'hvac', 'plumbing', 'electrical', 'roofing'
  ].includes(s)) return 'pest_control';

  if ([
    'landscaping', 'landscape', 'lawn', 'lawn care', 'grounds', 'groundskeeping',
    'crew landscaping', 'landscape maintenance'
  ].includes(s)) return 'landscaping';

  if (['re', 'realestate', 'real-estate', 'real estate', 'rei', 'investor'].includes(s)) {
    return 'real_estate';
  }

  if (['wholesaling', 'wholesale', 'wholesaler', 'wre'].includes(s)) return 'wholesaler';

  if ([
    'fitness', 'gym', 'healthclub', 'health club',
    'studio', 'yoga', 'pilates', 'spin', 'boxing',
    'medspa', 'med spa', 'spa', 'salon'
  ].includes(s)) return 'fitness';

  if ([
    'food', 'food_wellness', 'food-wellness', 'food wellness',
    'wellness', 'nutrition', 'meal', 'meal plan', 'meal plans',
    'farm2farmacy', 'f2f'
  ].includes(s)) return 'food_wellness';

  if (['auto', 'automotive', 'car', 'dealership'].includes(s)) return 'auto';

  return 'general';
}

/** Best-effort guess from name/domain if industry missing or vague. */
function inferIndustry({ name = '', domain = '' } = {}) {
  const n = String(name).toLowerCase();
  const d = String(domain).toLowerCase();

  // Name heuristics
  if (/\bpest\b/.test(n)) return 'pest_control';
  if (/\blandscap|lawn|grounds\b/.test(n)) return 'landscaping';
  if (/\b(real|rei|invest)\b/.test(n)) return 'real_estate';
  if (/\bwholesal/.test(n)) return 'wholesaler';
  if (/\bfit|gym|club\b/.test(n)) return 'fitness';
  if (/\bfarm2farmacy\b/.test(n) || /\bf2f\b/.test(n) || /\bwellness\b/.test(n) || /\bmeal\b/.test(n)) {
    return 'food_wellness';
  }
  if (/\bauto|car\b/.test(n)) return 'auto';

  // Domain hints (optional)
  if (/\bpest\b/.test(d)) return 'pest_control';
  if (/\blandscap|lawn|grounds\b/.test(d)) return 'landscaping';
  if (/\breal|rei\b/.test(d)) return 'real_estate';
  if (/\bfarm2farmacy\b/.test(d) || /\bf2f\b/.test(d)) return 'food_wellness';

  return 'general';
}

const TENANT_OPTIONAL_PATHS = [
  '/accounts/auth/login/',
  '/accounts/auth/refresh/',
  '/accounts/auth/switch-tenant/',
  '/accounts/auth/tenant-signup/',
  '/accounts/tenant-signup/',
];

/** Read the saved tenant object from localStorage. */
export function getActiveTenant() {
  try {
    const raw = localStorage.getItem('activeTenant');
    return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save/update the active tenant. Ensures a normalized `industry` field.
 * Returns the saved tenant object and emits a same-tab event for UI refresh.
 */
export function setActiveTenant(nextTenant) {
  if (!nextTenant) return null;

  const current = getActiveTenant() || {};
  const merged = { ...current, ...nextTenant };
  merged.id = merged.id || merged.tenant_id || merged.uuid || null;
  merged.tenant_id = merged.id;

  // Normalize with sensible fallbacks (use name/domain if needed)
  const normalized = normalizeIndustry(
    merged.industry || merged.vertical || merged.segment
  );
  merged.industry = normalized !== 'general'
    ? normalized
    : normalizeIndustry(inferIndustry({ name: merged.name, domain: merged.domain }));

  try {
    localStorage.setItem('activeTenant', JSON.stringify(merged));
    if (merged.id) localStorage.setItem('activeTenantId', merged.id);
  } catch (e) {
    console.error('setActiveTenant: failed to write localStorage', e);
    return merged;
  }

  // Same-tab update signal (storage doesn't fire in the same tab)
  try { window.dispatchEvent(new Event('activeTenant:changed')); } catch {}

  return merged;
}

/** Remove the active tenant from storage and notify listeners. */
export function clearActiveTenant() {
  try {
    localStorage.removeItem('activeTenant');
    localStorage.removeItem('activeTenantId');
  } catch {
    // ignore
  }
  try { window.dispatchEvent(new Event('activeTenant:changed')); } catch {}
}

/** Current industry key for the app (kept as your public API). */
export function getIndustry(fallback = 'general') {
  const t = getActiveTenant();
  return normalizeIndustry(t?.industry || fallback);
}

/** Optional: user role helper for role‑gated UI bits. */
export function getUserRole(fallback = 'Member') {
  try {
    const t = getActiveTenant();
    return t?.role || localStorage.getItem('userRole') || fallback;
  } catch {
    return fallback;
  }
}

/** Hydrate tenant from login payload (handles various backend shapes). */
export function ensureTenantFromLoginPayload(payload = {}) {
  const incomingTenant = payload.activeTenant || payload.tenant || payload.organization || null;
  if (!incomingTenant) return getActiveTenant();
  return setActiveTenant(incomingTenant);
}

export const isTenantRequiredRequest = (url = '') => {
  const target = String(url || '');
  if (!target) return true;
  if (target.includes('/accounts/auth/')) return false;
  return !TENANT_OPTIONAL_PATHS.some((path) => target.includes(path));
};

export const tenantSelectionRequiredError = (message = 'Tenant selection required') => {
  const err = new Error(message);
  err.code = 'TENANT_REQUIRED';
  return err;
};

export const persistTenants = (list = []) => {
  const normalized = Array.isArray(list)
    ? list.map((t = {}) => ({
        id: t.id || t.tenant_id || t.uuid || null,
        tenant_id: t.id || t.tenant_id || t.uuid || null,
        name: t.name || t.tenant_name || 'Workspace',
        domain: t.domain || t.tenant_domain || null,
        industry: normalizeIndustry(t.industry || t.vertical || t.segment),
        setupComplete: t.setupComplete ?? t.setup_complete ?? true,
      }))
    : [];

  try {
    localStorage.setItem('tenants', JSON.stringify(normalized));
  } catch {
    // ignore
  }
  return normalized;
};

export const getStoredTenants = () => {
  try {
    const raw = localStorage.getItem('tenants');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
