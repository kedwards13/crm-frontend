import api from "../apiClient";

const SELLERS_BASE = "/sellers";

export async function fetchDocuments(leadId) {
  const { data } = await api.get(`${SELLERS_BASE}/documents/`, {
    params: { lead_id: leadId },
  });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function fetchSignatures(leadId) {
  const { data } = await api.get(`${SELLERS_BASE}/signatures/list/`, {
    params: { lead_id: leadId },
  });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function createContractRecord(leadId, payload) {
  const { data } = await api.post(`${SELLERS_BASE}/contracts/`, {
    lead: leadId,
    ...payload,
  });
  return data;
}

export async function generatePdf(contractToken) {
  const { data } = await api.get(`${SELLERS_BASE}/contracts/${contractToken}/pdf/`, {
    responseType: "blob",
  });
  return data;
}
