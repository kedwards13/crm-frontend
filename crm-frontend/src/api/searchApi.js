import api from "../apiClient";
import { normalizeSmartQuery } from "../utils/smartQuery";

export const globalSearch = (query) =>
  api.get("/search/", {
    params: { q: normalizeSmartQuery(query) },
  });
