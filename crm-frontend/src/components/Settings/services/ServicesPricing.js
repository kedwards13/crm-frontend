import React, { useEffect, useMemo, useState } from 'react';
import api, { normalizeArray } from '../../../apiClient';
import '../SettingsCommon.css';

const SERVICE_ENDPOINTS = [
  { list: '/services/', detail: (id) => `/services/${id}/` },
  { list: '/services/offerings/', detail: (id) => `/services/offerings/${id}/` },
  { list: '/scheduling/service-types/', detail: (id) => `/scheduling/service-types/${id}/` },
];

const TIERS = [
  { name: 'Core', margin: '42%', label: 'Standard residential services' },
  { name: 'Premium', margin: '54%', label: 'Commercial + priority response' },
  { name: 'Maintenance', margin: '36%', label: 'Recurring protection plans' },
];

const parseApiList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.services)) return payload.services;
  if (Array.isArray(payload?.offerings)) return payload.offerings;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return normalizeArray(payload);
};

const isFallbackStatus = (status) => status === 404 || status === 405;

const formatDuration = (value) => {
  if (value == null || value === '') return '—';
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return `${asNumber} min`;
  return String(value);
};

const formatPrice = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && value.includes('$')) return value;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return `$${asNumber.toFixed(2)}`;
  return String(value);
};

const normalizeStatus = (row = {}) => {
  const rawStatus = String(row?.status || row?.state || '').trim().toLowerCase();
  if (rawStatus === 'removed' || rawStatus === 'archived' || rawStatus === 'deleted') return 'removed';
  if (rawStatus === 'paused' || rawStatus === 'inactive') return 'paused';
  if (rawStatus === 'active') return 'active';
  if (typeof row?.is_active === 'boolean') return row.is_active ? 'active' : 'paused';
  return 'active';
};

const normalizeServiceRow = (row = {}, endpoint) => {
  const id = row?.id || row?.pk || row?.service_id || null;
  const durationValue =
    row?.duration ||
    row?.duration_minutes ||
    row?.default_duration_minutes ||
    row?.estimated_duration_minutes ||
    '';
  const priceValue = row?.price ?? row?.base_price ?? row?.unit_price ?? row?.amount;
  const tierValue = row?.tier || row?.category || row?.plan || '—';
  const statusField = Object.prototype.hasOwnProperty.call(row, 'is_active') ? 'is_active' : 'status';

  return {
    id,
    name: row?.name || row?.title || row?.service_name || row?.code || 'Untitled Service',
    duration: formatDuration(durationValue),
    price: formatPrice(priceValue),
    tier: String(tierValue),
    status: normalizeStatus(row),
    statusField,
    detailEndpoint: id ? endpoint.detail(id) : '',
    raw: row,
  };
};

export default function ServicesPricing() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const hasRows = useMemo(() => services.length > 0, [services]);

  const loadServices = async () => {
    setLoading(true);
    setError('');

    try {
      let lastError = null;

      for (const endpoint of SERVICE_ENDPOINTS) {
        try {
          const response = await api.get(endpoint.list);
          const rows = parseApiList(response.data).map((row) =>
            normalizeServiceRow(row, endpoint)
          );
          setServices(rows);
          return;
        } catch (err) {
          lastError = err;
          if (isFallbackStatus(err?.response?.status)) continue;
          break;
        }
      }

      throw lastError || new Error('Unable to load services');
    } catch (err) {
      setServices([]);
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          'Unable to load service catalog.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const patchServiceStatus = async (service, nextStatus) => {
    if (!service?.id || !service?.detailEndpoint) return;

    const payloads = [];
    if (service.statusField === 'is_active') {
      payloads.push({ is_active: nextStatus === 'active' });
    } else {
      payloads.push({ status: nextStatus });
    }

    payloads.push({
      status: nextStatus,
      is_active: nextStatus === 'active',
    });
    payloads.push({ active: nextStatus === 'active' });

    let lastError = null;
    for (const payload of payloads) {
      try {
        return await api.patch(service.detailEndpoint, payload);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Unable to update service status.');
  };

  const updateStatus = async (service, nextStatus) => {
    if (!service?.id) return;

    const previousStatus = service.status;
    setMsg('');
    setError('');
    setSavingId(service.id);
    setServices((prev) =>
      prev.map((row) =>
        row.id === service.id ? { ...row, status: nextStatus } : row
      )
    );

    try {
      const response = await patchServiceStatus(service, nextStatus);
      const updated = normalizeServiceRow(
        { ...service.raw, ...(response?.data || {}), status: nextStatus },
        { detail: () => service.detailEndpoint }
      );
      setServices((prev) =>
        prev.map((row) => (row.id === service.id ? { ...row, ...updated } : row))
      );
      setMsg('Service status updated.');
    } catch (err) {
      setServices((prev) =>
        prev.map((row) =>
          row.id === service.id ? { ...row, status: previousStatus } : row
        )
      );
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          'Unable to update service status.'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="settings-page">
      <h2>Services & Pricing</h2>
      <p className="muted">Define your service catalog, pricing tiers, and discount rules.</p>
      {msg && <p className="settings-msg">{msg}</p>}
      {error && <p className="settings-msg settings-msg-error">{error}</p>}

      <div className="settings-card">
        <h3>Service Catalog</h3>
        {loading ? (
          <p>Loading services...</p>
        ) : !hasRows ? (
          <p className="muted">No services found yet.</p>
        ) : null}

        <div className="table-like">
          <div className="row header">
            <div>Service</div>
            <div>Duration</div>
            <div>Base Price</div>
            <div>Tier</div>
            <div>Status</div>
            <div></div>
          </div>
          {services.map((service) => (
            <div key={service.id || service.name} className="row">
              <input value={service.name} readOnly />
              <input value={service.duration} readOnly />
              <input value={service.price} readOnly />
              <input value={service.tier} readOnly />
              <select
                value={service.status}
                onChange={(event) => updateStatus(service, event.target.value)}
                disabled={savingId === service.id}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="removed">Remove</option>
              </select>
              <button
                className="mini danger"
                onClick={() => updateStatus(service, 'removed')}
                disabled={savingId === service.id}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button className="mini" onClick={loadServices} disabled={loading}>
          Refresh Services
        </button>
      </div>

      <div className="settings-card two-col">
        <div>
          <h3>Pricing Tiers</h3>
          {TIERS.map((tier) => (
            <div key={tier.name} className="row">
              <input defaultValue={tier.name} />
              <input defaultValue={tier.margin} />
              <input defaultValue={tier.label} />
            </div>
          ))}
          <button className="mini">Add Tier</button>
        </div>
        <div>
          <h3>Discount Rules</h3>
          <label>Recurring Plan Discount
            <input defaultValue="10%" />
          </label>
          <label>Bundle Discount
            <input defaultValue="15%" />
          </label>
          <label>Seasonal Promo Code
            <input defaultValue="SPRING25" />
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-primary">Save Pricing</button>
        <button className="settings-secondary">Preview Quote</button>
      </div>
    </div>
  );
}
