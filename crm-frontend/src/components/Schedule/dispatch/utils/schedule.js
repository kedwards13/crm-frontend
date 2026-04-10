const DEFAULT_OFFICE_START = "08:00";
const DEFAULT_OFFICE_END = "18:30";
const DEFAULT_TRAVEL_MINUTES = 10;

const parseClock = (value, fallback) => {
  const source = String(value || fallback || "").trim();
  const [hours, minutes] = source.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return parseClock(fallback || DEFAULT_OFFICE_START, DEFAULT_OFFICE_START);
  }
  return hours * 60 + minutes;
};

const formatClock = (totalMinutes) => {
  const normalized = Math.max(0, Math.round(Number(totalMinutes || 0)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const computeRouteSchedule = (appointments, options = {}) => {
  const {
    officeStart = DEFAULT_OFFICE_START,
    officeEnd = DEFAULT_OFFICE_END,
    travelMinutes = DEFAULT_TRAVEL_MINUTES,
  } = options;

  const officeStartMinutes = parseClock(officeStart, DEFAULT_OFFICE_START);
  const officeEndMinutes = parseClock(officeEnd, DEFAULT_OFFICE_END);
  let currentTime = officeStartMinutes;

  return (Array.isArray(appointments) ? appointments : []).map((appointment) => {
    const duration = Number(
      appointment?.serviceDurationMinutes ||
        appointment?.durationMinutes ||
        appointment?.service_duration_minutes ||
        60
    );
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 60;
    const start = Math.max(currentTime, officeStartMinutes);
    const end = start + safeDuration;

    currentTime = end + Math.max(0, Number(travelMinutes || 0));

    return {
      ...appointment,
      computedStart: formatClock(start),
      computedEnd: formatClock(end),
      outsideOfficeHours: end > officeEndMinutes,
    };
  });
};
