import api from "../apiClient";

export const listAppointments = (params = {}) =>
  api.get("/appointments/appointments/", { params });

export const getAppointment = (id) =>
  api.get(`/appointments/appointments/${id}/`);

export const createAppointment = (payload) =>
  api.post("/appointments/appointments/", {
    customer_id: payload?.customer_id ?? payload?.customer,
    lead_id: payload?.lead_id ?? payload?.lead,
    assigned_user_id:
      payload?.assigned_user_id ?? payload?.assigned_user ?? payload?.assigned_to,
    assigned_user: payload?.assigned_user ?? payload?.assigned_to,
    scheduled_at: payload?.scheduled_at ?? payload?.start ?? payload?.start_time,
    start: payload?.start ?? payload?.start_time ?? payload?.scheduled_at,
    end: payload?.end ?? payload?.end_time,
    duration_minutes: payload?.duration_minutes ?? payload?.duration,
    duration: payload?.duration ?? payload?.duration_minutes,
    service_type: payload?.service_type,
    notes: payload?.notes,
    tenant_id: payload?.tenant_id,
  });

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

export const getAppointmentAvailableSlots = (params = {}) =>
  api.get("/appointments/available-slots/", { params });

export const appointmentSmartReplyContext = (id) =>
  api.get(`/appointments/appointments/${id}/smart_reply_context/`);

export const appointmentAiSummary = (id) =>
  api.post(`/appointments/appointments/${id}/ai_summary/`);

export const appointmentTriggerFollowup = (id) =>
  api.post(`/appointments/appointments/${id}/trigger_followup/`);
