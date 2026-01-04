// =======================================================================
// CONTACT MAPPER — MERGED CUSTOMER + LEAD + REVIVAL (FINAL VERSION)
// =======================================================================

// --------------------------------------
// HELPERS
// --------------------------------------
const cleanDigits = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
};

const normalizeEmail = (v) => {
  if (!v) return null;
  return String(v).trim().toLowerCase();
};

const ensureUID = (raw) => {
  if (!raw) return null;
  return raw.universal_id ||
    `temp-${raw.id}-${Math.random().toString(36).slice(2, 10)}`;
};

// --------------------------------------
// TYPE DETECTORS — FINAL FIXED VERSION
// --------------------------------------
const isCustomer = (raw) =>
  raw?.object === "customer" ||
  raw?.customer_id !== undefined ||
  (raw?.all_phones && raw.all_phones.length > 0) ||
  (!!raw?.primary_phone && cleanDigits(raw.primary_phone));

const isRevival = (raw) =>
  raw?.object === "revival" ||
  raw?.items !== undefined ||
  raw?.estimated_total !== undefined;

const isLead = (raw) =>
  raw?.object === "lead" ||
  raw?.source_table === "forms_generic" ||
  raw?.phone_number !== undefined;

// =======================================================================
// FINAL MERGE LOGIC — KEY FEATURE
// =======================================================================
function mergeFields(customer, lead) {
  if (!customer && !lead) return {};

  const c = customer || {};
  const l = lead || {};

  // Full name
  const fullName =
    c.full_name ||
    l.full_name ||
    c.name ||
    l.name ||
    `${c.first_name || l.first_name || ""} ${c.last_name || l.last_name || ""}`.trim() ||
    c.company_name ||
    l.company_name ||
    "Customer";

  // Merge phones (customer priority)
  const phones = [
    c.primary_phone,
    c.secondary_phone,
    c.phone,
    ...(c.all_phones || []),
    l.primary_phone,
    l.phone_number,
    l.phone,
    ...(l.attributes?.phone_numbers || [])
  ]
    .map(cleanDigits)
    .filter(Boolean);

  // Merge emails (customer priority)
  const emails = [
    c.primary_email,
    c.secondary_email,
    c.email,
    ...(c.all_emails || []),
    l.primary_email,
    l.email,
    ...(l.attributes?.emails || [])
  ]
    .map(normalizeEmail)
    .filter(Boolean);

  return {
    full_name: fullName,
    phones,
    emails
  };
}

// =======================================================================
// MAIN ENTRY
// =======================================================================
export function mapEntity(raw) {
  if (!raw) return null;

  if (isCustomer(raw)) return mapCustomer(raw);
  if (isRevival(raw)) return mapRevival(raw);
  if (isLead(raw)) return mapLead(raw);

  return mapUnknown(raw);
}

// =======================================================================
// CUSTOMER — merged with lead if possible
// =======================================================================
export function mapCustomer(c) {
  const merged = mergeFields(c, c.matched_lead || c.lead);

  return {
    object: "customer",
    id: c.customer_id || c.id,
    universal_id: ensureUID(c),
    full_name: merged.full_name,
    phones: merged.phones,
    emails: merged.emails,
    industry: c.industry || c.raw?.industry || "general",
    raw: { ...c },
    quotes: Array.isArray(c.quotes) ? c.quotes : [],
  };
}

// =======================================================================
// REVIVAL
// =======================================================================
export function mapRevival(q) {
  const merged = mergeFields(q, q.lead);

  return {
    object: "revival",
    id: q.id,
    customer_id: q.customer || q.customer_id || null,
    universal_id: ensureUID(q),
    full_name: merged.full_name,
    phones: merged.phones,
    emails: merged.emails,
    industry: q.industry || "general",
    raw: { ...q },
  };
}

// =======================================================================
// LEAD
// =======================================================================
export function mapLead(l) {
  const merged = mergeFields(null, l);

  return {
    object: "lead",
    id: l.id,
    universal_id: ensureUID(l),
    full_name: merged.full_name,
    phones: merged.phones,
    emails: merged.emails,
    industry: l.industry || "general",
    raw: { ...l },
  };
}

// =======================================================================
// UNKNOWN
// =======================================================================
function mapUnknown(raw) {
  const merged = mergeFields(raw, raw);

  return {
    object: "unknown",
    id: raw.customer_id || raw.id,
    universal_id: ensureUID(raw),
    full_name: merged.full_name,
    phones: merged.phones,
    emails: merged.emails,
    raw: { ...raw }
  };
}

export const mapEntityToContact = mapEntity;
