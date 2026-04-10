import api from "../apiClient";

// FieldRoutes operational scheduling surfaces (read-only, paginated DRF format)
export const listOperationalSchedules = (params = {}) =>
  api.get("/operations/schedules/", { params });

export const listOperationalTechnicians = (params = {}) =>
  api.get("/operations/technicians/", { params });

