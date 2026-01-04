import api from "../apiClient";

export const listAppointments = (params = {}) =>
  api.get("/appointments/appointments/", { params });

export const getAppointment = (id) =>
  api.get(`/appointments/appointments/${id}/`);

export const createAppointment = (payload) =>
  api.post("/appointments/appointments/", payload);

export const updateAppointment = (id, payload) =>
  api.patch(`/appointments/appointments/${id}/`, payload);

export const deleteAppointment = (id) =>
  api.delete(`/appointments/appointments/${id}/`);

export const rescheduleAppointment = (id, payload) =>
  api.post(`/appointments/appointments/${id}/reschedule/`, payload);

export const cancelAppointment = (id) =>
  api.post(`/appointments/appointments/${id}/cancel/`);

export const completeAppointment = (id) =>
  api.post(`/appointments/appointments/${id}/complete/`);

export const rebookAppointment = (id) =>
  api.post(`/appointments/appointments/${id}/rebook/`);

export const sendAppointmentReminder = (id) =>
  api.post(`/appointments/appointments/${id}/send_reminder/`);

export const remindToday = () =>
  api.post("/appointments/appointments/remind_today/");

export const appointmentOverview = (params = {}) =>
  api.get("/appointments/appointments/overview/", { params });

export const appointmentSmartReplyContext = (id) =>
  api.get(`/appointments/appointments/${id}/smart_reply_context/`);

export const appointmentAiSummary = (id) =>
  api.post(`/appointments/appointments/${id}/ai_summary/`);

export const appointmentTriggerFollowup = (id) =>
  api.post(`/appointments/appointments/${id}/trigger_followup/`);
