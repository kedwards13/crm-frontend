import api from "../apiClient";

export const orchestrateAssistant = async (payload = {}) => {
  const response = await api.post("/assistant/orchestrate/", payload);
  return response?.data || {};
};

const assistantApi = {
  orchestrateAssistant,
};

export default assistantApi;
