// src/services/enrichment/enrich.js
export async function fetchEnrichedLead(first, last, address, phone) {
  const res = await fetch('https://ai.abon.ai/enrich-customer/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: localStorage.getItem('activeTenantId'),
      customer_id: localStorage.getItem('activeCustomerId'),
      first_name: first,
      last_name: last,
      phone,
      address,
    }),
  });

  const result = await res.json();

  if (result?.status === 'ok') {
    return result.data; // Includes enrichment_data and ai_attributes
  }

  return null;
}