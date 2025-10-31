// crm-frontend/src/helpers/tenantHelpers.js

/** Normalize arbitrary industry/vertical strings into the registry keys. */
export function normalizeIndustry(raw) {
    // Accept objects or strings gracefully
    const s0 = typeof raw === 'string' ? raw : (raw?.industry || raw?.vertical || raw?.segment || '');
    const s = String(s0 || 'general').trim().toLowerCase().replace(/\s+/g, ' ');
  
    // Already-normalized keys (idempotent)
    if (['pest_control', 'real_estate', 'wholesaler', 'fitness', 'auto', 'general'].includes(s)) {
      return s;
    }
  
    // Aliases
    if ([
      'pest', 'pestcontrol', 'pest-control', 'pest control', 'pc',
      'sunpest', 'sun pest', 'sun pest control'
    ].includes(s)) return 'pest_control';
  
    if (['re', 'realestate', 'real-estate', 'real estate', 'rei', 'investor'].includes(s)) {
      return 'real_estate';
    }
  
    if (['wholesaling', 'wholesale', 'wholesaler', 'wre'].includes(s)) return 'wholesaler';
  
    if (['fitness', 'gym', 'healthclub', 'health club'].includes(s)) return 'fitness';
  
    if (['auto', 'automotive', 'car', 'dealership'].includes(s)) return 'auto';
  
    return 'general';
  }
  
  /** Best-effort guess from name/domain if industry missing or vague. */
  function inferIndustry({ name = '', domain = '' } = {}) {
    const n = String(name).toLowerCase();
    const d = String(domain).toLowerCase();
  
    // Name heuristics
    if (/\bpest\b/.test(n)) return 'pest_control';
    if (/\b(real|rei|invest)\b/.test(n)) return 'real_estate';
    if (/\bwholesal/.test(n)) return 'wholesaler';
    if (/\bfit|gym|club\b/.test(n)) return 'fitness';
    if (/\bauto|car\b/.test(n)) return 'auto';
  
    // Domain hints (optional)
    if (/\bpest\b/.test(d)) return 'pest_control';
    if (/\breal|rei\b/.test(d)) return 'real_estate';
  
    return 'general';
  }
  
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
    const merged  = { ...current, ...nextTenant };
  
    // Normalize with sensible fallbacks (use name/domain if needed)
    const normalized = normalizeIndustry(
      merged.industry || merged.vertical || merged.segment
    );
    merged.industry = normalized !== 'general'
      ? normalized
      : normalizeIndustry(inferIndustry({ name: merged.name, domain: merged.domain }));
  
    try {
      localStorage.setItem('activeTenant', JSON.stringify(merged));
    } catch (e) {
      console.error('setActiveTenant: failed to write localStorage', e);
      return merged;
    }
  
    // Same-tab update signal (storage doesn't fire in the same tab)
    try { window.dispatchEvent(new Event('activeTenant:changed')); } catch {}
  
    return merged;
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