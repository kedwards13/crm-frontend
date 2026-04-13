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
// TYPE DETECTORS — STRICT, EXPLICIT ORDERING
// --------------------------------------
// Priority order enforced in mapEntity: explicit revival → lead → customer.
// This prevents leads that happen to have a primary_phone from being
// misclassified as customers (which caused PATCH /api/customers/{lead_id}/
// → 404 and/or cross-tenant lookups).

const isRevival = (raw) =>
  raw?.object === "revival" ||
  Array.isArray(raw?.items) ||
  raw?.estimated_total !== undefined ||
  raw?.public_token !== undefined;

const isLead = (raw) =>
  raw?.object === "lead" ||
  raw?.source_table === "forms_generic" ||
  raw?.lead_id !== undefined ||
  raw?.pipeline_stage !== undefined ||
  raw?.safePipelineStage !== undefined ||
  raw?.lead_number !== undefined ||
  raw?.crm_lead_id !== undefined ||
  raw?.intake_attributes !== undefined;

const isCustomer = (raw) =>
  raw?.object === "customer" ||
  raw?.source_table === "customers" ||
  raw?.account_number !== undefined ||
  // customer_id is a UUID on Customer model; only trust it when it actually
  // looks like a UUID. Leads sometimes carry this key in metadata as an int.
  (typeof raw?.customer_id === "string" && /^[0-9a-f-]{32,36}$/i.test(raw.customer_id)) ||
  (Array.isArray(raw?.all_phones) && raw.all_phones.length > 0) ||
  (Array.isArray(raw?.all_emails) && raw.all_emails.length > 0);

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

  // Explicit object type (set by API caller) takes absolute priority.
  // This prevents scanner-created customers fetched from /api/customers/
  // from being misclassified as leads by the heuristic detectors below.
  if (raw?.object === "customer") return mapCustomer(raw);
  if (raw?.object === "revival") return mapRevival(raw);
  if (raw?.object === "lead") return mapLead(raw);

  // Heuristic detection for records without an explicit object type.
  // Order matters: check for explicit lead/revival markers BEFORE customer,
  // because a lead can carry a primary_phone that would otherwise trip
  // the customer detector and route PATCH to /api/customers/{lead_id}/.
  if (isRevival(raw)) return mapRevival(raw);
  if (isLead(raw)) return mapLead(raw);
  if (isCustomer(raw)) return mapCustomer(raw);

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
// Lead records can come from TWO sources:
//   (a) CRMLead list   → l.id is the CRMLead PK (numeric). /leads/crm-leads/{id}/
//   (b) Web inbox list → l.id is the leadgen forms_generic PK (numeric).
//                        If the web lead has already been forwarded to the CRM,
//                        l.crm_lead_id holds the real CRMLead PK — prefer it.
//                        If NOT forwarded yet, there is no CRMLead to PATCH and
//                        the popup save path should fall back to "Add to Pipeline"
//                        (the LeadsPage already exposes that button).
export function mapLead(l) {
  const merged = mergeFields(null, l);
  const crmId = l.crm_lead_id || l.id;
  const webLeadId = l.source_table === "forms_generic" ? l.id : l.web_lead_id || null;

  return {
    object: "lead",
    id: crmId,
    crm_lead_id: crmId,
    web_lead_id: webLeadId,
    is_forwarded_web_lead: Boolean(l.crm_lead_id && l.source_table === "forms_generic"),
    is_pending_web_lead: Boolean(l.source_table === "forms_generic" && !l.crm_lead_id),
    universal_id: ensureUID(l),
    full_name: merged.full_name,
    phones: merged.phones,
    emails: merged.emails,
    industry: l.industry || "general",
    pipeline_stage: l.pipeline_stage || l.safePipelineStage || null,
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
