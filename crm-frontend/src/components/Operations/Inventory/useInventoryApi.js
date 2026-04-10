import { useCallback, useMemo } from 'react';
import api from '../../../apiClient';
import { normalizeArray, toApiError } from '../../../api/client';

const readRows = (payload) => {
  if (Array.isArray(payload?.items)) return payload.items;
  return normalizeArray(payload);
};

const safeList = async (request) => {
  try {
    const { data } = await request();
    return readRows(data);
  } catch {
    return [];
  }
};

export default function useInventoryApi() {
  const listProducts = useCallback(async (params = {}) => {
    const { data } = await api.get('/inventory/products/', { params });
    return normalizeArray(data);
  }, []);

  const getProduct = useCallback(async (id) => {
    const { data } = await api.get(`/inventory/products/${id}/`);
    return data;
  }, []);

  const createProduct = useCallback(async (payload) => {
    const { data } = await api.post('/inventory/products/', payload);
    return data;
  }, []);

  const updateProduct = useCallback(async (id, payload) => {
    const { data } = await api.put(`/inventory/products/${id}/`, payload);
    return data;
  }, []);

  const deleteProduct = useCallback(async (id) => {
    await api.delete(`/inventory/products/${id}/`);
    return true;
  }, []);

  const listVendors = useCallback(async () => {
    const { data } = await api.get('/inventory/vendors/');
    return normalizeArray(data);
  }, []);

  const listLocations = useCallback(async () => {
    const { data } = await api.get('/inventory/locations/');
    return normalizeArray(data);
  }, []);

  const listStock = useCallback(async (params = {}) => {
    const { data } = await api.get('/inventory/stock-ledger/', { params });
    return normalizeArray(data);
  }, []);

  const postStock = useCallback(async (payload) => {
    const { data } = await api.post('/inventory/stock-ledger/', payload);
    return data;
  }, []);

  const listOrders = useCallback(async (params = {}) => {
    const { data } = await api.get('/inventory/purchase-orders/', { params });
    return normalizeArray(data);
  }, []);

  const createOrder = useCallback(async (payload) => {
    const { data } = await api.post('/inventory/purchase-orders/', payload);
    return data;
  }, []);

  const updateOrder = useCallback(async (id, payload) => {
    const { data } = await api.put(`/inventory/purchase-orders/${id}/`, payload);
    return data;
  }, []);

  const receiveOrder = useCallback(async (id, payload) => {
    const { data } = await api.post(`/inventory/purchase-orders/${id}/receive/`, payload);
    return data;
  }, []);

  const quickReorder = useCallback(async ({ product_id, qty, vendor_id = null, price = 0 }) => {
    const payload = {
      vendor: vendor_id,
      status: 'draft',
      lines: [{ product: product_id, qty, price }],
    };
    const { data } = await api.post('/inventory/purchase-orders/', payload);
    return data;
  }, []);

  const lowStock = useCallback((params = {}) => safeList(() => api.get('/inventory/reports/low-stock/', { params })), []);
  const consumption = useCallback((params = {}) => safeList(() => api.get('/inventory/reports/consumption/', { params })), []);
  const recommendations = useCallback(
    (params = {}) => safeList(() => api.get('/inventory/reports/recommendations/', { params })),
    []
  );

  const reorderSuggestions = recommendations;

  const ingestLabel = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/inventory/products/ingest-label/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data?.draft || {};
    } catch (error) {
      throw toApiError(error, 'Label ingest failed');
    }
  }, []);

  return useMemo(
    () => ({
      listProducts,
      getProduct,
      createProduct,
      updateProduct,
      deleteProduct,
      listVendors,
      listLocations,
      listStock,
      postStock,
      listOrders,
      createOrder,
      updateOrder,
      receiveOrder,
      quickReorder,
      lowStock,
      consumption,
      recommendations,
      reorderSuggestions,
      ingestLabel,
      getLowStock: lowStock,
      getConsumption: consumption,
      getRecommendations: recommendations,
    }),
    [
      listProducts,
      getProduct,
      createProduct,
      updateProduct,
      deleteProduct,
      listVendors,
      listLocations,
      listStock,
      postStock,
      listOrders,
      createOrder,
      updateOrder,
      receiveOrder,
      quickReorder,
      lowStock,
      consumption,
      recommendations,
      reorderSuggestions,
      ingestLabel,
    ]
  );
}

