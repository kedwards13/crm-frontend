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
