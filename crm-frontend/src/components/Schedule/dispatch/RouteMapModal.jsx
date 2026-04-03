import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  Polyline,
  useLoadScript,
} from "@react-google-maps/api";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const TECH_COLORS = {
  Austin: "#3b82f6",
  Derick: "#10b981",
  Eduardo: "#f59e0b",
  Sean: "#8b5cf6",
  Taylor: "#ef4444",
};
const DEFAULT_TECH_COLOR = "#6b7280";
const DEFAULT_CENTER = { lat: 30.3, lng: -97.7 };

function techColor(name) {
  return TECH_COLORS[name] || DEFAULT_TECH_COLOR;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function RouteMapModal({ open, onClose, dayData, date }) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;
  const mapRef = useRef(null);
  const [activeMarker, setActiveMarker] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "missing-key",
    mapIds: mapId ? [mapId] : undefined,
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Build per-tech route data
  const { techRoutes, skippedCount } = useMemo(() => {
    if (!dayData?.by_tech) return { techRoutes: [], skippedCount: 0 };

    let skipped = 0;
    const routes = [];

    for (const [techName, jobs] of Object.entries(dayData.by_tech)) {
      const color = techColor(techName);
      const withCoords = [];
      const withoutCoords = [];

      for (let i = 0; i < jobs.length; i++) {
        const j = jobs[i];
        const lat = parseFloat(j.customer_lat ?? j.lat ?? j.latitude);
        const lng = parseFloat(j.customer_lng ?? j.lng ?? j.longitude);

        if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0) {
          withCoords.push({ ...j, _lat: lat, _lng: lng, _idx: i });
        } else {
          withoutCoords.push(j);
        }
      }

      skipped += withoutCoords.length;

      if (withCoords.length > 0) {
        routes.push({
          techName,
          color,
          stops: withCoords,
          totalJobs: jobs.length,
          totalDuration: jobs.reduce((s, j) => s + (j.duration || 0), 0),
          missingCount: withoutCoords.length,
        });
      }
    }

    return { techRoutes: routes, skippedCount: skipped };
  }, [dayData]);

  // All markers flat
  const allMarkers = useMemo(
    () =>
      techRoutes.flatMap((route) =>
        route.stops.map((stop, idx) => ({
          key: `${route.techName}-${stop.job_id || idx}`,
          techName: route.techName,
          color: route.color,
          position: { lat: stop._lat, lng: stop._lng },
          stopNumber: idx + 1,
          isNew: !!stop.is_new,
          job: stop,
        }))
      ),
    [techRoutes]
  );

  // Fit bounds on load / data change
  const fitBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || allMarkers.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    allMarkers.forEach((m) => bounds.extend(m.position));
    mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 100, left: 40 });
    if (allMarkers.length === 1) {
      mapRef.current.setZoom(14);
    }
  }, [allMarkers]);

  useEffect(() => {
    if (isLoaded && open) {
      // Small delay to ensure map has rendered
      const t = setTimeout(fitBounds, 200);
      return () => clearTimeout(t);
    }
  }, [isLoaded, open, fitBounds]);

  if (!open) return null;

  const dateLabel = date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const mapStatus = !apiKey
    ? "Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the map."
    : loadError
    ? "Unable to load Google Maps."
    : !isLoaded
    ? "Loading map..."
    : "";

  return (
    <div className="mp-map-overlay" onClick={onClose}>
      <div className="mp-map-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mp-map-header">
          <span className="mp-map-title">Route Map — {dateLabel}</span>
          <button className="mp-map-close" onClick={onClose} aria-label="Close map">
            &times;
          </button>
        </div>

        {/* Map canvas */}
        <div className="mp-map-canvas">
          {mapStatus ? (
            <div className="mp-map-empty">{mapStatus}</div>
          ) : (
            <GoogleMap
              mapContainerClassName="mp-map-inner"
              center={DEFAULT_CENTER}
              zoom={10}
              options={{
                mapId: mapId || undefined,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
              }}
              onLoad={(map) => {
                mapRef.current = map;
                fitBounds();
              }}
              onUnmount={() => {
                mapRef.current = null;
              }}
            >
              {/* Polylines */}
              {techRoutes.map((route) => {
                const path = route.stops.map((s) => ({ lat: s._lat, lng: s._lng }));
                if (path.length < 2) return null;
                return (
                  <Polyline
                    key={`line-${route.techName}`}
                    path={path}
                    options={{
                      strokeColor: route.color,
                      strokeOpacity: 0.85,
                      strokeWeight: 3,
                    }}
                  />
                );
              })}

              {/* Markers */}
              {allMarkers.map((m) => (
                <Marker
                  key={m.key}
                  position={m.position}
                  label={{
                    text: String(m.stopNumber),
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                  onClick={() => setActiveMarker(m.key)}
                  icon={
                    m.isNew
                      ? {
                          path: "M 0,-8 L 6,0 L 0,8 L -6,0 Z",
                          fillColor: m.color,
                          fillOpacity: 1,
                          strokeColor: "#ffffff",
                          strokeWeight: 2,
                          scale: 1.3,
                          anchor: window.google?.maps
                            ? new window.google.maps.Point(0, 0)
                            : undefined,
                          labelOrigin: window.google?.maps
                            ? new window.google.maps.Point(0, 0)
                            : undefined,
                        }
                      : {
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 9,
                          fillColor: m.color,
                          fillOpacity: 1,
                          strokeColor: "#ffffff",
                          strokeWeight: 2,
                        }
                  }
                />
              ))}

              {/* Info window */}
              {activeMarker &&
                (() => {
                  const m = allMarkers.find((x) => x.key === activeMarker);
                  if (!m) return null;
                  const j = m.job;
                  return (
                    <InfoWindow
                      position={m.position}
                      onCloseClick={() => setActiveMarker(null)}
                    >
                      <div className="mp-map-info">
                        <div className="mp-map-info-tech" style={{ color: m.color }}>
                          {m.techName} — Stop #{m.stopNumber}
                          {m.isNew && <span className="mp-badge-new" style={{ marginLeft: 6 }}>NEW</span>}
                        </div>
                        <div className="mp-map-info-name">{j.customer_name || "—"}</div>
                        <div className="mp-map-info-detail">{j.service_type || "—"}</div>
                        <div className="mp-map-info-detail">{j.duration || 0} min</div>
                        {j.time && <div className="mp-map-info-detail">{j.time}</div>}
                        {j.score != null && (
                          <div className="mp-map-info-detail">
                            Score: <b>{Math.round(j.score)}</b>
                          </div>
                        )}
                      </div>
                    </InfoWindow>
                  );
                })()}
            </GoogleMap>
          )}
        </div>

        {/* Stats overlay */}
        <div className="mp-map-stats">
          {techRoutes.map((route) => (
            <div key={route.techName} className="mp-map-stat-row">
              <span
                className="mp-map-stat-dot"
                style={{ background: route.color }}
              />
              <span className="mp-map-stat-name">{route.techName}</span>
              <span className="mp-map-stat-val">
                {route.stops.length} stop{route.stops.length !== 1 ? "s" : ""}
              </span>
              <span className="mp-map-stat-val mp-text-muted">
                {Math.round((route.totalDuration / 60) * 10) / 10}h
              </span>
            </div>
          ))}
          {techRoutes.length > 1 && (
            <div className="mp-map-stat-row mp-map-stat-total">
              <span className="mp-map-stat-dot" style={{ background: "var(--text-muted)" }} />
              <span className="mp-map-stat-name">Total</span>
              <span className="mp-map-stat-val">
                {allMarkers.length} stop{allMarkers.length !== 1 ? "s" : ""}
              </span>
              <span className="mp-map-stat-val mp-text-muted">
                {Math.round(
                  (techRoutes.reduce((s, r) => s + r.totalDuration, 0) / 60) * 10
                ) / 10}
                h
              </span>
            </div>
          )}
          {skippedCount > 0 && (
            <div className="mp-map-stat-warning">
              {skippedCount} job{skippedCount !== 1 ? "s" : ""} without location
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
