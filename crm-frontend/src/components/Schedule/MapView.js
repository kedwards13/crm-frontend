import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindow, Marker, useLoadScript } from "@react-google-maps/api";
import "./SchedulePlaceholders.css";
import "./MapView.css";
import api from "../../apiClient";
import { listCrmLeads } from "../../api/leadsApi";
import { getCustomers } from "../../api/customersApi";

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

const normalizeName = (record, fallback) => {
  const name =
    record?.name ||
    record?.full_name ||
    [record?.first_name, record?.last_name].filter(Boolean).join(" ");
  return name || fallback;
};

const buildAddress = (record) => {
  const direct =
    record?.address ||
    record?.property_address ||
    record?.service_address ||
    record?.billing_address ||
    record?.location;
  if (direct) return direct;

  const parts = [
    record?.address1,
    record?.address2,
    record?.city,
    record?.state,
    record?.zip_code || record?.zip,
  ].filter(Boolean);
  return parts.join(", ");
};

const getCoordsFromArray = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const extractLatLng = (record) => {
  if (!record) return null;
  const directLat =
    record.lat ??
    record.latitude ??
    record.geo_lat ??
    record.location_lat ??
    record.coordinates?.lat ??
    record.location?.lat;
  const directLng =
    record.lng ??
    record.longitude ??
    record.geo_lng ??
    record.location_lng ??
    record.coordinates?.lng ??
    record.location?.lng;

  if (Number.isFinite(Number(directLat)) && Number.isFinite(Number(directLng))) {
    return { lat: Number(directLat), lng: Number(directLng) };
  }

  return (
    getCoordsFromArray(record.coordinates) ||
    getCoordsFromArray(record.location?.coordinates)
  );
};

export default function MapView() {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;
  const mapRef = useRef(null);
  const geocodeCacheRef = useRef(new Map());

  const [items, setItems] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({
    showCustomers: true,
    showLeads: true,
    query: "",
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "missing-key",
    mapIds: mapId ? [mapId] : undefined,
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");

    const fetchPaged = async (request) => {
      const first = await request();
      const initial = first.data;
      if (Array.isArray(initial)) return initial;

      let rows = initial?.results ? [...initial.results] : [];
      let next = initial?.next;
      while (next) {
        const { data } = await api.get(next);
        rows = rows.concat(data?.results || []);
        next = data?.next;
      }
      return rows;
    };

    try {
      const [customerRows, leadRows] = await Promise.all([
        fetchPaged(() => getCustomers({ page_size: 200 })),
        fetchPaged(() => listCrmLeads({ page_size: 200 })),
      ]);

      const mappedCustomers = customerRows.map((row, index) => ({
        id: row?.id || row?.customer_id || `customer-${index}`,
        type: "customer",
        name: normalizeName(row, "Unnamed Customer"),
        address: buildAddress(row),
        phone: row?.primary_phone || row?.phone_number || row?.phone || "",
        email: row?.primary_email || row?.email || "",
        status: row?.status || row?.lifecycle_stage || "",
        raw: row,
      }));

      const mappedLeads = leadRows.map((row, index) => ({
        id: row?.id || row?.lead_id || `lead-${index}`,
        type: "lead",
        name: normalizeName(row, "Unnamed Lead"),
        address: buildAddress(row),
        phone: row?.primary_phone || row?.phone_number || row?.phone || "",
        email: row?.primary_email || row?.email || "",
        status: row?.status || row?.stage || "",
        raw: row,
      }));

      setItems([...mappedCustomers, ...mappedLeads]);
    } catch (err) {
      console.error(err);
      setError("Failed to load customers or leads.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const visibleItems = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return items.filter((item) => {
      if (!filters.showCustomers && item.type === "customer") return false;
      if (!filters.showLeads && item.type === "lead") return false;
      if (!query) return true;
      const blob = `${item.name} ${item.address} ${item.phone} ${item.email}`
        .toLowerCase()
        .trim();
      return blob.includes(query);
    });
  }, [filters, items]);

  const visibleWithAddress = useMemo(
    () => visibleItems.filter((item) => item.address || extractLatLng(item.raw)),
    [visibleItems]
  );

  useEffect(() => {
    if (!isLoaded || loadError || !apiKey) return;
    let cancelled = false;

    const geocoder = new window.google.maps.Geocoder();
    const geocodeAddress = (address) =>
      new Promise((resolve) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const location = results[0].geometry.location;
            resolve({ lat: location.lat(), lng: location.lng() });
            return;
          }
          resolve(null);
        });
      });

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const resolvePoints = async () => {
      if (!visibleWithAddress.length) {
        setPoints([]);
        setGeocoding(false);
        return;
      }

      setGeocoding(true);
      const resolved = [];

      for (const item of visibleWithAddress) {
        if (cancelled) break;

        const direct = extractLatLng(item.raw) || extractLatLng(item);
        if (direct) {
          resolved.push({ ...item, position: direct });
          continue;
        }

        const cached = geocodeCacheRef.current.get(item.address);
        if (cached) {
          resolved.push({ ...item, position: cached });
          continue;
        }

        if (item.address) {
          const result = await geocodeAddress(item.address);
          if (result) {
            geocodeCacheRef.current.set(item.address, result);
            resolved.push({ ...item, position: result });
          }
          await sleep(120);
        }
      }

      if (!cancelled) {
        setPoints(resolved);
        setGeocoding(false);
      }
    };

    resolvePoints();

    return () => {
      cancelled = true;
    };
  }, [apiKey, isLoaded, loadError, visibleWithAddress]);

  useEffect(() => {
    if (!mapRef.current || !points.length || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point.position));
    mapRef.current.fitBounds(bounds);
    if (points.length === 1) {
      mapRef.current.setZoom(13);
    }
  }, [points]);

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedId) || null,
    [points, selectedId]
  );

  const mappedIds = useMemo(
    () => new Set(points.map((point) => point.id)),
    [points]
  );

  const summary = useMemo(() => {
    const totals = {
      customers: visibleItems.filter((item) => item.type === "customer").length,
      leads: visibleItems.filter((item) => item.type === "lead").length,
      mapped: points.length,
    };
    totals.unmapped = visibleItems.length - totals.mapped;
    return totals;
  }, [points.length, visibleItems]);

  const fitAll = useCallback(() => {
    if (!mapRef.current || !points.length || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point.position));
    mapRef.current.fitBounds(bounds);
  }, [points]);

  const handleSelect = useCallback(
    (item) => {
      setSelectedId(item.id);
      const point = points.find((entry) => entry.id === item.id);
      if (!mapRef.current || !point) return;
      mapRef.current.panTo(point.position);
      mapRef.current.setZoom(13);
    },
    [points]
  );

  const getMarkerIcon = useCallback((type) => {
    if (!window.google?.maps) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: type === "lead" ? "#f59e0b" : "#38bdf8",
      fillOpacity: 0.9,
      strokeColor: "#0f172a",
      strokeWeight: 1.2,
    };
  }, []);

  const mapOptions = useMemo(
    () => ({
      mapId: mapId || undefined,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    }),
    [mapId]
  );

  const mapStatus = useMemo(() => {
    if (!apiKey) return "Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the map.";
    if (loadError) return "Unable to load Google Maps.";
    if (!isLoaded) return "Loading Google Maps...";
    return "";
  }, [apiKey, isLoaded, loadError]);

  return (
    <div className="schedule-placeholder map-view">
      <header className="schedule-header map-view-header">
        <div>
          <h2>Map View</h2>
          <p className="schedule-muted">
            Field route map for customers and leads with addressable locations.
          </p>
        </div>
        <div className="map-view-actions">
          <button
            className="schedule-btn secondary"
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="schedule-btn"
            onClick={fitAll}
            disabled={!points.length}
          >
            Fit All
          </button>
        </div>
      </header>

      <section className="schedule-grid map-view-stats">
        <div className="schedule-stat">
          <div className="label">Visible Stops</div>
          <div className="value">{visibleItems.length}</div>
        </div>
        <div className="schedule-stat">
          <div className="label">Mapped Pins</div>
          <div className="value">{summary.mapped}</div>
        </div>
        <div className="schedule-stat">
          <div className="label">Unmapped</div>
          <div className="value">{summary.unmapped}</div>
        </div>
        <div className="schedule-stat">
          <div className="label">Customers / Leads</div>
          <div className="value">
            {summary.customers} / {summary.leads}
          </div>
        </div>
      </section>

      <section className="map-view-body">
        <aside className="map-view-panel">
          <div className="map-view-card">
            <div className="map-view-toggle-row">
              <label className="map-view-toggle">
                <input
                  type="checkbox"
                  checked={filters.showCustomers}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      showCustomers: event.target.checked,
                    }))
                  }
                />
                <span className="map-view-dot customer" />
                Customers
              </label>
              <label className="map-view-toggle">
                <input
                  type="checkbox"
                  checked={filters.showLeads}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      showLeads: event.target.checked,
                    }))
                  }
                />
                <span className="map-view-dot lead" />
                Leads
              </label>
            </div>
            <div className="map-view-search">
              <input
                type="text"
                value={filters.query}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, query: event.target.value }))
                }
                placeholder="Search name, address, phone..."
              />
            </div>
            <div className="map-view-muted">
              {geocoding
                ? `Geocoding ${visibleWithAddress.length} locations...`
                : "Click a stop to zoom the map."}
            </div>
            {error && <div className="map-view-error">{error}</div>}
          </div>

          <div className="map-view-card map-view-list">
            {loading && (
              <div className="map-view-muted">Loading customers and leads…</div>
            )}
            {!loading && visibleItems.length === 0 && (
              <div className="map-view-muted">No records match the filters.</div>
            )}
            {visibleItems.map((item) => {
              const hasMarker = mappedIds.has(item.id);
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className={`map-view-item ${
                    selectedId === item.id ? "active" : ""
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  <div className="map-view-item-top">
                    <span className={`map-view-dot ${item.type}`} />
                    <span className="map-view-name">{item.name}</span>
                    <span className={`map-view-type ${item.type}`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="map-view-address">
                    {item.address || "Address missing"}
                  </div>
                  <div className="map-view-meta">
                    {item.status && (
                      <span className="map-view-tag">{item.status}</span>
                    )}
                    {item.phone && (
                      <span className="map-view-meta-text">{item.phone}</span>
                    )}
                    {!hasMarker && (
                      <span className="map-view-missing">Not mapped</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="map-view-map">
          <div className="map-canvas">
            {mapStatus ? (
              <div className="map-view-empty">{mapStatus}</div>
            ) : (
              <GoogleMap
                mapContainerClassName="map-canvas-inner"
                center={DEFAULT_CENTER}
                zoom={4}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
                onUnmount={(map) => {
                  window.google?.maps?.event?.clearInstanceListeners(map);
                  mapRef.current = null;
                }}
              >
                {points.map((point) => (
                  <Marker
                    key={`${point.type}-${point.id}`}
                    position={point.position}
                    icon={getMarkerIcon(point.type)}
                    onClick={() => setSelectedId(point.id)}
                  />
                ))}
                {selectedPoint && (
                  <InfoWindow
                    position={selectedPoint.position}
                    onCloseClick={() => setSelectedId(null)}
                  >
                    <div className="map-info-card">
                      <div className="map-info-title">{selectedPoint.name}</div>
                      <div className="map-info-meta">
                        {selectedPoint.type === "lead" ? "Lead" : "Customer"}
                      </div>
                      <div className="map-info-address">
                        {selectedPoint.address || "Address missing"}
                      </div>
                      {selectedPoint.status && (
                        <div className="map-info-meta">{selectedPoint.status}</div>
                      )}
                      {selectedPoint.phone && (
                        <div className="map-info-meta">{selectedPoint.phone}</div>
                      )}
                      {selectedPoint.email && (
                        <div className="map-info-meta">{selectedPoint.email}</div>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
