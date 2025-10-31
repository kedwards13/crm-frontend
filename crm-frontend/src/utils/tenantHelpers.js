// utils/tenantHelpers.js
export function setActiveTenant(data) {
  if (!data) return;
  const normalized = {
    id: data.id || data.tenant_id || null,
    domain: data.domain || data.tenant_domain || null,
    industry: data.industry || data.tenant_industry || null,
    setupComplete: data.setupComplete || data.setup_complete || false,
  };
  localStorage.setItem('activeTenant', JSON.stringify(normalized));
}

export function getActiveTenant() {
  try {
    return JSON.parse(localStorage.getItem('activeTenant')) || null;
  } catch {
    return null;
  }
}

/**
 * Returns the current tenant's industry, e.g. 'pest_control', 'real_estate', etc.
 * Falls back to 'general' if missing.
 */
export function getIndustry() {
  try {
    const tenant = JSON.parse(localStorage.getItem('activeTenant')) || {};
    return tenant.industry || 'general';
  } catch {
    return 'general';
  }
}