import api from "../apiClient";

export const listTemplates = (params = {}) =>
  api.get("/templates/templates/", { params });
