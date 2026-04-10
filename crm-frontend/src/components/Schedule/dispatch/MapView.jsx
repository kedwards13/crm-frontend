import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  Polyline,
  useLoadScript,
} from "@react-google-maps/api";
import {
  formatCurrency,
  formatTime,
} from "./utils";

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

export default function MapView({
  routes,
  selectedAppointmentId,
  onSelectAppointment,
}) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;
  const mapRef = useRef(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "missing-key",
    mapIds: mapId ? [mapId] : undefined,
  });

  const markers = useMemo(
    () =>
      routes.flatMap((route) =>
        route.stops
          .filter((appointment) => appointment.lat != null && appointment.lng != null)
          .map((appointment) => ({
            id: appointment.id,
            routeId: route.id,
            routeName: route.technicianName,
            routeColor: route.routeColor,
            appointment,
            position: { lat: Number(appointment.lat), lng: Number(appointment.lng) },
          }))
      ),
    [routes]
  );

  const selectedMarker = useMemo(() => {
    return (
      markers.find((marker) => String(marker.id) === String(selectedAppointmentId)) ||
      markers.find((marker) => String(marker.id) === String(hoveredMarkerId)) ||
      null
    );
  }, [hoveredMarkerId, markers, selectedAppointmentId]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;

    routes.forEach((route) => {
      route.pathPoints.forEach((point) => {
        if (point?.position?.lat == null || point?.position?.lng == null) return;
        bounds.extend(point.position);
        hasPoint = true;
      });
    });

    if (!hasPoint) return;
    mapRef.current.fitBounds(bounds);
    if (markers.length <= 1) {
      mapRef.current.setZoom(12);
    }
  }, [markers.length, routes]);

  const mapStatus = useMemo(() => {
    if (!apiKey) return "Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the live map.";
    if (loadError) return "Unable to load Google Maps.";
    if (!isLoaded) return "Loading map…";
    return "";
  }, [apiKey, isLoaded, loadError]);

  return (
    <section className="dispatch-map-panel">
      <header className="dispatch-panel-head">
        <div>
          <h3>Map View</h3>
          <p>Route lines and appointment markers stay synced with the proposed board state.</p>
        </div>
      </header>

      <div className="dispatch-map-canvas">
        {mapStatus ? (
          <div className="dispatch-map-empty">{mapStatus}</div>
        ) : (
          <GoogleMap
            mapContainerClassName="dispatch-map-inner"
            center={DEFAULT_CENTER}
            zoom={4}
            options={{
              mapId: mapId || undefined,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
            }}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
          >
            {routes.map((route) => {
              const routePath = route.pathPoints
                .map((point) => point.position)
                .filter((point) => point?.lat != null && point?.lng != null);
              if (routePath.length < 2) return null;
              return (
                <Polyline
                  key={`${route.id}-line`}
                  path={routePath}
                  options={{
                    strokeColor: route.routeColor || "#1d4ed8",
                    strokeOpacity: 0.92,
                    strokeWeight: String(route.id).includes("unassigned") ? 2 : 4,
                  }}
                />
              );
            })}

            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
                label={{
                  text: String(
                    routes
                      .find((route) => route.id === marker.routeId)
                      ?.stops.findIndex((stop) => stop.id === marker.id) + 1 || ""
                  ),
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
                onClick={() => {
                  setHoveredMarkerId(marker.id);
                  onSelectAppointment?.(marker.appointment);
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: String(marker.id) === String(selectedAppointmentId) ? 9 : 7,
                  fillColor: marker.routeColor || "#1d4ed8",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              />
            ))}

            {selectedMarker ? (
              <InfoWindow
                position={selectedMarker.position}
                onCloseClick={() => setHoveredMarkerId(null)}
              >
                <div className="dispatch-map-popup">
                  <div className="dispatch-map-popup-kicker">{selectedMarker.routeName}</div>
                  <strong>{selectedMarker.appointment.customerName}</strong>
                  <span>{selectedMarker.appointment.serviceName}</span>
                  <span>
                    {selectedMarker.appointment.computedStart ||
                      formatTime(selectedMarker.appointment.proposedStart)}{" "}
                    -{" "}
                    {selectedMarker.appointment.computedEnd ||
                      formatTime(selectedMarker.appointment.proposedEnd)}
                  </span>
                  {selectedMarker.appointment.value ? (
                    <span>{formatCurrency(selectedMarker.appointment.value)}</span>
                  ) : null}
                  {selectedMarker.appointment.address ? (
                    <span>{selectedMarker.appointment.address}</span>
                  ) : null}
                </div>
              </InfoWindow>
            ) : null}
          </GoogleMap>
        )}
      </div>
    </section>
  );
}
