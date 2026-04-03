import api from "../apiClient";

export const listServiceTypes = (params = {}) =>
  api.get("/scheduling/service-types/", { params });

export const createServiceType = (payload) =>
  api.post("/scheduling/service-types/", payload);

export const updateServiceType = (id, payload) =>
  api.patch(`/scheduling/service-types/${id}/`, payload);

export const deleteServiceType = (id) =>
  api.delete(`/scheduling/service-types/${id}/`);

export const listBusinessHours = (params = {}) =>
  api.get("/scheduling/business-hours/", { params });

export const createBusinessHours = (payload) =>
  api.post("/scheduling/business-hours/", payload);

export const updateBusinessHours = (id, payload) =>
  api.patch(`/scheduling/business-hours/${id}/`, payload);

export const deleteBusinessHours = (id) =>
  api.delete(`/scheduling/business-hours/${id}/`);

export const listTechnicians = (params = {}) =>
  api.get("/scheduling/technicians/", { params });

// Service plans (tenant-scoped). Note: the FieldRoutes import may populate
// "operations.FieldRoutesServicePlan" independently; this endpoint serves the
// CRM "scheduling.ServicePlan" model.
export const listServicePlans = (params = {}) =>
  api.get("/scheduling/service-plans/", { params });

export const getServicePlan = (id) =>
  api.get(`/scheduling/service-plans/${id}/`);

export const updateServicePlan = (id, payload) =>
  api.patch(`/scheduling/service-plans/${id}/`, payload);

export const listTechAvailability = (params = {}) =>
  api.get("/scheduling/tech-availability/", { params });

export const createTechAvailability = (payload) =>
  api.post("/scheduling/tech-availability/", payload);

export const updateTechAvailability = (id, payload) =>
  api.patch(`/scheduling/tech-availability/${id}/`, payload);

export const deleteTechAvailability = (id) =>
  api.delete(`/scheduling/tech-availability/${id}/`);

export const listBlackouts = (params = {}) =>
  api.get("/scheduling/blackouts/", { params });

export const createBlackout = (payload) =>
  api.post("/scheduling/blackouts/", payload);

export const updateBlackout = (id, payload) =>
  api.patch(`/scheduling/blackouts/${id}/`, payload);

export const deleteBlackout = (id) =>
  api.delete(`/scheduling/blackouts/${id}/`);

export const listAvailability = (params = {}) =>
  api.get("/scheduling/schedules/availability/", { params });

export const listSchedules = (params = {}) =>
  api.get("/scheduling/schedules/", { params });

export const getSchedule = (id) =>
  api.get(`/scheduling/schedules/${id}/`);

export const createSchedule = (payload) =>
  api.post("/scheduling/schedules/", payload);

export const updateSchedule = (id, payload) =>
  api.patch(`/scheduling/schedules/${id}/`, payload);

export const deleteSchedule = (id) =>
  api.delete(`/scheduling/schedules/${id}/`);

export const reschedule = (id, payload) =>
  api.post(`/scheduling/schedules/${id}/reschedule/`, payload);

export const cancelSchedule = (id) =>
  api.post(`/scheduling/schedules/${id}/cancel/`);

export const quickBook = (payload, params = {}) =>
  api.post("/scheduling/schedules/quick_book/", payload, { params });

export const optimizeRoutes = (payload = {}) =>
  api.post("/scheduling/schedules/optimize_routes/", payload);

export const getOptimizationPlan = (payload = {}) =>
  api.post("/scheduling/schedules/optimization_plan/", payload);

export const optimizeWithConstraints = (payload = {}) =>
  api.post("/scheduling/schedules/optimize_with_constraints/", payload);

export const applyOptimizationPlan = (payload = {}) =>
  api.post("/scheduling/schedules/apply_optimization_plan/", payload);

export const finalizeSchedule = (payload = {}) =>
  api.post("/scheduling/schedules/finalize_schedule/", payload);

export const getDispatchBoard = (params = {}) =>
  api.get("/scheduling/schedules/dispatch_board/", { params });

export const getRouteMap = (params = {}) =>
  api.get("/scheduling/schedules/route_map/", { params });

// ─── Month Fill (Auto-Scheduler) ───────────────────────────

export const previewMonthFill = (month, constraints = {}, weights = {}) =>
  api.post("/scheduling/month-fill/preview/", { month, constraints, weights });

export const getMonthPlan = (planId) =>
  api.get(`/scheduling/month-fill/${planId}/`);

export const getMonthPlanDay = (planId, date) =>
  api.get(`/scheduling/month-fill/${planId}/day/${date}/`);

export const adjustMonthPlan = (planId, moves) =>
  api.post(`/scheduling/month-fill/${planId}/adjust/`, { moves });

export const advanceMonthPlan = (planId, toState) =>
  api.post(`/scheduling/month-fill/${planId}/advance/`, { to_state: toState });

export const getMonthPlanIssues = (planId) =>
  api.get(`/scheduling/month-fill/${planId}/issues/`);

export const getMonthPlanProjections = (planId) =>
  api.get(`/scheduling/month-fill/${planId}/projections/`);
