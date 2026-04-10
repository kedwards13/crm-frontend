// src/services/enrichment/enrich.js
import api from '../apiClient';
import { getActiveTenant } from '../helpers/tenantHelpers';

export async function fetchEnrichedLead(first, last, address, phone) {
  const tenant = getActiveTenant();
  const customerId = localStorage.getItem('activeCustomerId');
  const { data: result } = await api.post('/customers/enrich/', {
    tenant_id: tenant?.id || localStorage.getItem('activeTenantId'),
    customer_id: customerId,
    first_name: first,
    last_name: last,
    phone,
    address,
  });

  if (result?.status === 'ok') {
    return result.data; // Includes enrichment_data and ai_attributes
  }

  return null;
}
