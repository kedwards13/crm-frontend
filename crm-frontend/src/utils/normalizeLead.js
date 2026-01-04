export function normalizeLead(lead = {}) {
  const displayName =
    lead.name ||
    [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
    "Unnamed Lead";

  return {
    ...lead,
    displayEmail: lead.primary_email || lead.email || null,
    displayPhone: lead.primary_phone || lead.phone_number || null,
    displayName,
    safeStatus: lead.status || "new",
    safeIndustry: lead.industry || "general",
    serviceLabel: lead.service || lead.industry_role || "General Inquiry",
  };
}
