import api from "../apiClient";

// Backend source of truth: crm_backend/analytics_app/urls.py (mounted at /api/analytics/*).
// These helpers keep the UI resilient: callers should expect some endpoints to
// return empty payloads or 500s while FieldRoutes backfills are in progress.

export const getAnalyticsOverview = (params = {}) =>
  api.get("/analytics/overview/", { params });

export const getRevenueInsights = (params = {}) =>
  api.get("/analytics/revenue-insights/", { params });

export const getRevenueSummary = (params = {}) =>
  api.get("/analytics/revenue-summary/", { params });

export const listPlanningScenarios = (params = {}) =>
  api.get("/analytics/planning/scenarios/", { params });

export const createPlanningScenario = (payload = {}) =>
  api.post("/analytics/planning/scenarios/", payload);

export const updatePlanningScenario = (scenarioId, payload = {}) =>
  api.patch(`/analytics/planning/scenarios/${scenarioId}/`, payload);

export const deletePlanningScenario = (scenarioId) =>
  api.delete(`/analytics/planning/scenarios/${scenarioId}/`);

export const getCostConfiguration = (params = {}) =>
  api.get("/analytics/cost-configuration/", { params });

export const updateCostConfiguration = (payload = {}) =>
  api.patch("/analytics/cost-configuration/", payload);

export const updateCompensationProfile = (userId, payload = {}) =>
  api.patch(`/analytics/compensation-profiles/${userId}/`, payload);

export const getExecutableMetricPreview = (params = {}) =>
  api.get("/analytics/executable-metrics/", { params });

export const runSmartAnalyticsQuery = (params = {}) =>
  api.get("/analytics/smart-query/", { params });

export const saveAnalyticsAudience = (payload = {}) =>
  api.post("/analytics/audiences/save/", payload);

export const getLeadAttributionMetrics = (params = {}) =>
  api.get("/analytics/lead-attribution/", { params });

export const getRevenueDaily = (params = {}) =>
  api.get("/analytics/revenue/daily/", { params });

export const getRevenueMonthly = (params = {}) =>
  api.get("/analytics/revenue/monthly/", { params });

export const getRouteLoad = (params = {}) =>
  api.get("/analytics/route-load/", { params });

export const getTechnicianCapacity = (params = {}) =>
  api.get("/analytics/technician-capacity/", { params });

export const getTechnicianUtilization = (params = {}) =>
  api.get("/analytics/technician-utilization/", { params });

export const getMissedAppointments = (params = {}) =>
  api.get("/analytics/missed-appointments/", { params });

export const getMissedRecovery = (params = {}) =>
  api.get("/analytics/missed-recovery/", { params });

export const getLeadPerformance = (params = {}) =>
  api.get("/analytics/lead-performance/", { params });

export const getSalesRepPerformance = (params = {}) =>
  api.get("/analytics/sales-rep-performance/", { params });

export const getRecurringRevenue = (params = {}) =>
  api.get("/analytics/recurring-revenue/", { params });

export const getServiceBreakdown = (params = {}) =>
  api.get("/analytics/service-breakdown/", { params });

export const getOperationalWorkspace = (params = {}) =>
  api.get("/analytics/ontology/workspace/", { params });

export const getPreServiceBrief = (params = {}) =>
  api.get("/analytics/ontology/pre-service-brief/", { params });

export const ingestOperationalMemory = (payload = {}) =>
  api.post("/analytics/ontology/memories/ingest/", payload);

export const executeAnalyticsAction = (actionType, payload = {}) =>
  api.post("/analytics/actions/execute/", {
    action_type: actionType,
    payload,
  });

export const explainAnalyticsSummary = (summary = {}) =>
  api.post("/analytics/voice/explain/", { summary });
