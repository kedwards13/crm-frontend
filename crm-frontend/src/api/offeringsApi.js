import api from "../apiClient";

export const listOfferings = (params = {}) =>
  api.get("/services/offerings/", { params });
