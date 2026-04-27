import api from "../apiClient";

// ── D2D Sale ──────────────────────────────────────────────────

export const createD2DSale = (payload) =>
  api.post("/sales/d2d/create-sale/", payload);

// ── FieldRoutes sync visibility ───────────────────────────────

export const getSyncStatus = () =>
  api.get("/sales/fieldroutes/sync-status/");

export const getSyncIssues = (params = {}) =>
  api.get("/sales/fieldroutes/sync-issues/", { params });

export const retrySyncItems = (appointmentIds) =>
  api.post("/sales/fieldroutes/sync-retry/", {
    appointment_ids: appointmentIds,
  });
