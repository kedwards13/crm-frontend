// src/components/Operations/Inventory/useInventoryApi.js
import { useCallback, useMemo } from "react";

const API_BASE = process.env.REACT_APP_API_URL;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helpful: surface serializer errors instead of just a status code
async function assertOk(res, label) {
  if (res.ok) return;
  let detail = "";
  try { detail = JSON.stringify(await res.json()); } catch {}
  throw new Error(`${label} ${res.status} ${detail}`);
}

export default function useInventoryApi() {
  // ---------- PRODUCTS ----------
  const listProducts = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/inventory/products/${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    await assertOk(res, "listProducts");
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  }, []);

  const getProduct = useCallback(async (id) => {
    const res = await fetch(`${API_BASE}/api/inventory/products/${id}/`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    await assertOk(res, `getProduct ${id}`);
    return res.json();
  }, []);

  const createProduct = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/inventory/products/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, "createProduct");
    return res.json();
  }, []);

  const updateProduct = useCallback(async (id, payload) => {
    const res = await fetch(`${API_BASE}/api/inventory/products/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, `updateProduct ${id}`);
    return res.json();
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const res = await fetch(`${API_BASE}/api/inventory/products/${id}/`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    await assertOk(res, `deleteProduct ${id}`);
    return true;
  }, []);

  // ---------- VENDORS ----------
  const listVendors = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/inventory/vendors/`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    await assertOk(res, "listVendors");
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  }, []);

  // ---------- LOCATIONS ----------
  const listLocations = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/inventory/locations/`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    await assertOk(res, "listLocations");
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  }, []);

  // ---------- STOCK (ledger) ----------
  const listStock = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/inventory/stock-ledger/${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    await assertOk(res, "listStock");
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  }, []);

  const postStock = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/inventory/stock-ledger/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, "postStock");
    return res.json();
  }, []);

  // ---------- PURCHASE ORDERS ----------
  const listOrders = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/inventory/purchase-orders/${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    await assertOk(res, "listOrders");
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  }, []);

  const createOrder = useCallback(async (payload /* {vendor, status, lines:[{product, qty, price}]} */) => {
    const res = await fetch(`${API_BASE}/api/inventory/purchase-orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, "createOrder");
    return res.json();
  }, []);

  const updateOrder = useCallback(async (id, payload) => {
    const res = await fetch(`${API_BASE}/api/inventory/purchase-orders/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, `updateOrder ${id}`);
    return res.json();
  }, []);

  const receiveOrder = useCallback(async (id, payload /* { lines:[{line_id, qty, lot?, expiry?, location}] } */) => {
    const res = await fetch(`${API_BASE}/api/inventory/purchase-orders/${id}/receive/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, `receiveOrder ${id}`);
    return res.json();
  }, []);

  // Quick reorder = create a draft PO with a single line (backend has no quick-reorder action)
  const quickReorder = useCallback(async ({ product_id, qty, vendor_id = null, price = 0 }) => {
    const payload = {
      vendor: vendor_id,
      status: "draft",
      lines: [{ product: product_id, qty, price }],
    };
    const res = await fetch(`${API_BASE}/api/inventory/purchase-orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await assertOk(res, "quickReorder");
    return res.json();
  }, []);

  // ---------- REPORTS ----------
  const lowStock = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/inventory/reports/low-stock/${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || (Array.isArray(data) ? data : (data.results || []));
  }, []);

  const consumption = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/inventory/reports/consumption/${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || (Array.isArray(data) ? data : (data.results || []));
  }, []);

  const recommendations = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/inventory/reports/recommendations/${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || (Array.isArray(data) ? data : (data.results || []));
  }, []);

  // Legacy alias used by OverviewPage
  const reorderSuggestions = recommendations;

  // ---------- INGEST LABEL ----------
  const ingestLabel = useCallback(async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/inventory/products/ingest-label/`, {
      method: "POST",
      headers: { ...authHeaders() }, // let the browser set multipart boundary
      credentials: "include",
      body: form,
    });
    await assertOk(res, "ingestLabel");
    const data = await res.json();
    return data.draft || {};
  }, []);

  // ---------- EXPORT ----------
  return useMemo(() => ({
    // products
    listProducts, getProduct, createProduct, updateProduct, deleteProduct,
    // vendors & locations
    listVendors, listLocations,
    // stock
    listStock, postStock,
    // orders
    listOrders, createOrder, updateOrder, receiveOrder, quickReorder,
    // reports
    lowStock, consumption, recommendations,
    reorderSuggestions,
    // ingest
    ingestLabel,
    // handy aliases (if older code expects them)
    getLowStock: lowStock,
    getConsumption: consumption,
    getRecommendations: recommendations,
  }), [
    listProducts, getProduct, createProduct, updateProduct, deleteProduct,
    listVendors, listLocations,
    listStock, postStock,
    listOrders, createOrder, updateOrder, receiveOrder, quickReorder,
    lowStock, consumption, recommendations, ingestLabel
  ]);
}