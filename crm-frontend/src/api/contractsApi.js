// src/api/contractsApi.js
const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:808/api/sellers';

async function checkStatus(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res;
}

export async function fetchDocuments(leadId, token) {
  const res = await fetch(`${BASE}/documents/?lead_id=${leadId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkStatus(res);
  return res.json();
}

export async function fetchSignatures(leadId, token) {
  // GET signatures from the “list” endpoint
  const res = await fetch(`${BASE}/signatures/list/?lead_id=${leadId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return [];
  await checkStatus(res);
  return res.json();
}

export async function createContractRecord(leadId, payload, token) {
  const res = await fetch(`${BASE}/contracts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lead: leadId, ...payload }),
  });
  await checkStatus(res);
  return res.json();
}

export async function generatePdf(contractToken, token) {
  // Use the /contracts/<token>/pdf/ endpoint
  const res = await fetch(`${BASE}/contracts/${contractToken}/pdf/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkStatus(res);
}