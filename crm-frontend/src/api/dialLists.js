import api from "../apiClient";

export const uploadDialList = async (file, options = {}) => {
  const form = new FormData();
  form.append("file", file);
  if (options.name) form.append("name", options.name);
  if (options.region) form.append("region", options.region);
  if (options.source) form.append("source", options.source);
  if (options.default_from_number) form.append("default_from_number", options.default_from_number);

  const res = await api.post("/dial-lists/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data || {};
};

export const fetchDialLists = async () => {
  const res = await api.get("/dial-lists");
  return res.data || [];
};

export const fetchDialListContacts = async (dialListId) => {
  const res = await api.get(`/dial-lists/${dialListId}/contacts`);
  return res.data || [];
};
