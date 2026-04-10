const DEFAULT_ROUTE_START_HOUR = 8;
const MIN_BUFFER_MINUTES = 10;

export const clean = (value) => String(value || "").trim();

export const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toIsoString = (value) => {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : "";
};

export const addMinutes = (value, minutes) => {
  const base = toDate(value);
  if (!base) return null;
  return new Date(base.getTime() + Number(minutes || 0) * 60000);
};

export const formatTime = (value) => {
  const parsed = toDate(value);
  if (!parsed) return "—";
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatDateTime = (value) => {
  const parsed = toDate(value);
  if (!parsed) return "—";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatHours = (minutes) => {
  const totalMinutes = Math.max(0, Number(minutes || 0));
  const hours = totalMinutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
};

export const formatMinutes = (minutes) => {
  const totalMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

export const formatDayLabel = (value) => {
  const raw = clean(value);
  if (!raw) return "—";
  const parsed = toDate(`${raw}T12:00:00`);
  if (!parsed) return raw;
  return parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const enumerateDays = (startDate, endDate) => {
  const start = toDate(`${clean(startDate)}T12:00:00`);
  const end = toDate(`${clean(endDate)}T12:00:00`);
  if (!start || !end || start > end) return [];
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const lastName = (fullName) => {
  const normalized = clean(fullName);
  if (!normalized) return "Customer";
  const parts = normalized.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : normalized;
};

export const joinAddress = (...parts) => parts.map(clean).filter(Boolean).join(", ");

const startOfDay = (day, hour = DEFAULT_ROUTE_START_HOUR) => {
  const raw = clean(day);
  if (!raw) return null;
  return toDate(`${raw}T${String(hour).padStart(2, "0")}:00:00`);
};

const diffDays = (left, right) => {
  const a = toDate(left);
  const b = toDate(right);
  if (!a || !b) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0)) / dayMs);
};

const diffMinutes = (left, right) => {
  const a = toDate(left);
  const b = toDate(right);
  if (!a || !b) return 0;
  return Math.round((a.getTime() - b.getTime()) / 60000);
};

const haversineMiles = (left, right) => {
  if (!left || !right) return 0;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = Number(left.lat);
  const lng1 = Number(left.lng);
  const lat2 = Number(right.lat);
  const lng2 = Number(right.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;

  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
};

const estimateTravelMinutes = (miles) => Math.round((Number(miles || 0) / 32) * 60);

const getDurationMinutes = (schedule, stop, fallback) => {
  const stopDuration = Number(stop?.duration_minutes || 0);
  if (stopDuration > 0) return stopDuration;

  const scheduleStart = toDate(schedule?.scheduled_start);
  const scheduleEnd = toDate(schedule?.scheduled_end);
  if (scheduleStart && scheduleEnd && scheduleEnd > scheduleStart) {
    return Math.round((scheduleEnd.getTime() - scheduleStart.getTime()) / 60000);
  }

  return Number(fallback || 60);
};

const getPosition = (record) => {
  const lat = toNumber(record?.lat ?? record?.dest_lat ?? record?.latitude);
  const lng = toNumber(record?.lng ?? record?.dest_lng ?? record?.longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
};

const getPreferenceDetails = (metadata) => {
  const preferredDays = metadata?.preferred_days || metadata?.preferredDays || [];
  const preferredTimeWindow =
    metadata?.preferred_time_window || metadata?.preferredTimeWindow || {};
  const accessInstructions = metadata?.access_instructions || metadata?.accessInstructions || [];
  return {
    preferred_days: Array.isArray(preferredDays) ? preferredDays : [],
    preferred_time_window:
      preferredTimeWindow && typeof preferredTimeWindow === "object"
        ? preferredTimeWindow
        : {},
    access_instructions: Array.isArray(accessInstructions) ? accessInstructions : [],
  };
};

export const isAppointmentModified = (appointment) => {
  if (!appointment) return false;
  return (
    clean(appointment.proposedRouteId) !== clean(appointment.currentRouteId) ||
    clean(appointment.proposedTechnicianId) !== clean(appointment.currentTechnicianId) ||
    clean(appointment.proposedFieldroutesTechnicianId) !==
      clean(appointment.currentFieldroutesTechnicianId) ||
    clean(appointment.proposedStart) !== clean(appointment.currentStart) ||
    clean(appointment.proposedEnd) !== clean(appointment.currentEnd)
  );
};

export const getExecutionKeyCandidates = (appointment) =>
  [
    appointment?.crmAppointmentId,
    appointment?.externalId,
    appointment?.fieldroutesAppointmentId,
    appointment?.id,
  ]
    .map(clean)
    .filter(Boolean);

export const getVisualState = (appointment, execution) => {
  const outcome = clean(execution?.outcome);
  if (outcome === "applied") return "applied";
  if (outcome === "skipped" || outcome === "blocked") return outcome;
  if (outcome === "failed" || outcome === "partial_sync" || outcome === "drift_detected") {
    return "failed";
  }
  return isAppointmentModified(appointment) ? "modified" : "preview";
};

const withinWindow = (value, window = {}) => {
  const candidate = toDate(value);
  if (!candidate) return false;
  const start = clean(window?.start_date);
  const end = clean(window?.end_date);
  if (!start || !end) return true;
  const startValue = toDate(`${start}T00:00:00`);
  const endValue = toDate(`${end}T23:59:59`);
  if (!startValue || !endValue) return true;
  return candidate >= startValue && candidate <= endValue;
};

const normalizePathPoint = (point = {}) => {
  const position =
    point?.position && typeof point.position === "object"
      ? {
          lat: toNumber(point.position.lat),
          lng: toNumber(point.position.lng),
        }
      : {
          lat: toNumber(point?.lat),
          lng: toNumber(point?.lng),
        };
  if (position.lat == null || position.lng == null) return null;
  return {
    id: clean(point?.id),
    type: clean(point?.type) || "appointment",
    label: clean(point?.label),
    order: Number(point?.order || point?.route_order || 0),
    position,
  };
};

const buildSnapshotDispatchState = ({ board, day, schedulingConfig }) => {
  const appointmentsById = {};
  const routesById = {};
  const routeOrder = [];
  const fallbackWindow = {
    start_date: clean(day),
    end_date: clean(day),
  };

  (Array.isArray(board?.routes) ? board.routes : []).forEach((route) => {
    const routeId = clean(route?.id || route?.route_key);
    if (!routeId) return;

    const serviceDay = clean(route?.service_day || route?.date || day);
    const routeStops = Array.isArray(route?.stops) ? route.stops : [];
    const stopIds = [];

    routeStops.forEach((stop, index) => {
      const appointmentId =
        clean(stop?.id) ||
        clean(stop?.crm_appointment_id) ||
        clean(stop?.fieldroutes_appointment_id) ||
        clean(stop?.external_id) ||
        `${routeId}-stop-${index + 1}`;
      const customerName = clean(stop?.customer_name) || "Customer";
      const currentStart = clean(stop?.scheduled_start);
      const currentEnd = clean(stop?.scheduled_end);
      const fieldroutesAppointmentId =
        clean(stop?.fieldroutes_appointment_id) ||
        (clean(stop?.source) === "fieldroutes" ? clean(stop?.external_id) : "");
      const technicianId = clean(route?.technician_id || stop?.technician_id);
      const fieldroutesTechnicianId =
        clean(route?.fieldroutes_technician_id) ||
        (clean(stop?.source) === "fieldroutes" ? technicianId : clean(stop?.metadata?.fieldroutes_technician_id));

      appointmentsById[appointmentId] = {
        id: appointmentId,
        routeId,
        crmAppointmentId: clean(stop?.crm_appointment_id),
        externalId: clean(stop?.external_id) || fieldroutesAppointmentId || appointmentId,
        fieldroutesAppointmentId,
        customerId: clean(stop?.customer_id),
        customerName,
        lastName: lastName(customerName),
        serviceName: clean(stop?.service_type) || "Service",
        value: Number(stop?.estimated_value || 0),
        address:
          clean(stop?.property_location) || joinAddress(stop?.city, stop?.zip_code),
        city: clean(stop?.city),
        state: "",
        zipCode: clean(stop?.zip_code),
        lat: toNumber(stop?.latitude),
        lng: toNumber(stop?.longitude),
        status: clean(stop?.status) || "scheduled",
        notes: clean(stop?.notes),
        priority: "normal",
        durationMinutes: Number(stop?.duration_minutes || schedulingConfig?.defaultDurationMins || 60),
        routeOrder: index + 1,
        source: clean(stop?.source),
        classification: clean(stop?.classification),
        planningClassification: clean(stop?.planning_classification),
        dueDate: clean(stop?.due_date),
        dueDateFlexDays: Number(stop?.due_date_flex_days || 0),
        dueDateDeviationDays: Number(stop?.due_date_deviation_days || 0),
        routeGroup: clean(stop?.route_group),
        continuityRecentTechnicians: Array.isArray(stop?.continuity_recent_technicians)
          ? stop.continuity_recent_technicians
          : [],
        requiredSkills: Array.isArray(stop?.required_skills) ? stop.required_skills : [],
        officeId: clean(stop?.office_id || route?.office_id),
        serviceDay,
        currentStart,
        currentEnd,
        currentRouteId: clean(stop?.route_id || route?.route_id),
        currentRouteTitle: clean(stop?.route_title || route?.route_title),
        currentTechnicianId: technicianId,
        currentTechnicianName: clean(route?.technician_name || stop?.technician_name) || "Unassigned",
        currentTechnicianRole: clean(route?.technician_role),
        currentFieldroutesTechnicianId: fieldroutesTechnicianId,
        proposedStart: currentStart,
        proposedEnd: currentEnd,
        proposedRouteId: clean(stop?.route_id || route?.route_id),
        proposedRouteTitle: clean(stop?.route_title || route?.route_title),
        proposedTechnicianId: technicianId,
        proposedTechnicianName: clean(route?.technician_name || stop?.technician_name) || "Unassigned",
        proposedFieldroutesTechnicianId: fieldroutesTechnicianId,
        preferenceDetails: {
          preferred_days: Array.isArray(stop?.preferred_days) ? stop.preferred_days : [],
          preferred_time_window:
            stop?.preferred_time_window && typeof stop.preferred_time_window === "object"
              ? stop.preferred_time_window
              : {},
          access_instructions: Array.isArray(stop?.access_instructions)
            ? stop.access_instructions
            : [],
        },
        classificationReasons: Array.isArray(stop?.classification_reasons)
          ? stop.classification_reasons
          : [],
        metadata: stop?.metadata && typeof stop.metadata === "object" ? stop.metadata : {},
      };
      stopIds.push(appointmentId);
    });

    const anchorStart =
      routeStops
        .map((stop) => toDate(stop?.scheduled_start))
        .filter(Boolean)
        .sort((left, right) => left - right)[0] || startOfDay(serviceDay);

    routesById[routeId] = {
      id: routeId,
      serviceDay,
      technicianId: clean(route?.technician_id),
      technicianName: clean(route?.technician_name) || "Unassigned",
      technicianRole: clean(route?.technician_role),
      fieldroutesTechnicianId: clean(route?.fieldroutes_technician_id || route?.technician_id),
      routeTitle: clean(route?.route_title),
      officeId: clean(route?.office_id),
      officeName: clean(route?.office_name),
      routeColor: clean(route?.route_color) || "#1d4ed8",
      home: getPosition(route?.origin || route?.home),
      capacityMinutes: Number(route?.capacity_minutes || 0),
      anchorStart: toIsoString(anchorStart),
      stopIds,
      baselineTravelMinutes: Number(route?.drive_minutes ?? route?.travel_minutes ?? 0),
      baselineTravelMiles: Number(route?.distance_miles ?? route?.travel_miles ?? 0),
      baselineRevenue: Number(route?.route_revenue || 0),
      baselinePathPoints: (Array.isArray(route?.path_points) ? route.path_points : route?.path || [])
        .map(normalizePathPoint)
        .filter(Boolean),
      baselineRouteEfficiencyScore: Number(route?.route_efficiency_score || 0),
      routeStart: clean(route?.route_start),
      routeEnd: clean(route?.route_end),
      statusCounts:
        route?.status_counts && typeof route.status_counts === "object"
          ? route.status_counts
          : {},
      completionRate: Number(route?.completion_rate || 0),
      routeDensity: Number(route?.route_density || 0),
      syncStatus: clean(route?.sync_status),
      lockState: clean(route?.lock_state),
      roleLabel: clean(route?.technician_role) || clean(schedulingConfig?.staffLabel),
    };
    routeOrder.push(routeId);
  });

  const extraUnassignedStops = (Array.isArray(board?.unassigned) ? board.unassigned : []).filter((stop) => {
    const stopId =
      clean(stop?.id) ||
      clean(stop?.crm_appointment_id) ||
      clean(stop?.fieldroutes_appointment_id) ||
      clean(stop?.external_id);
    return stopId && !appointmentsById[stopId];
  });

  if (extraUnassignedStops.length) {
    const groupedStops = new Map();
    extraUnassignedStops.forEach((stop) => {
      const serviceDay =
        clean(stop?.service_day) ||
        clean(stop?.scheduled_start).slice(0, 10) ||
        clean(day);
      if (!groupedStops.has(serviceDay)) {
        groupedStops.set(serviceDay, []);
      }
      groupedStops.get(serviceDay).push(stop);
    });

    Array.from(groupedStops.entries()).forEach(([serviceDay, routeStops]) => {
      const routeId = `route-unassigned-${serviceDay}`;
      const stopIds = [];

      routeStops.forEach((stop, index) => {
        const appointmentId =
          clean(stop?.id) ||
          clean(stop?.crm_appointment_id) ||
          clean(stop?.fieldroutes_appointment_id) ||
          clean(stop?.external_id) ||
          `${routeId}-stop-${index + 1}`;
        if (appointmentsById[appointmentId]) return;
        const customerName = clean(stop?.customer_name) || "Customer";
        const currentStart = clean(stop?.scheduled_start);
        const currentEnd = clean(stop?.scheduled_end);
        appointmentsById[appointmentId] = {
          id: appointmentId,
          routeId,
          crmAppointmentId: clean(stop?.crm_appointment_id),
          externalId: clean(stop?.external_id) || appointmentId,
          fieldroutesAppointmentId: clean(stop?.fieldroutes_appointment_id),
          customerId: clean(stop?.customer_id),
          customerName,
          lastName: lastName(customerName),
          serviceName: clean(stop?.service_type) || "Service",
          value: Number(stop?.estimated_value || 0),
          address: clean(stop?.property_location) || joinAddress(stop?.city, stop?.zip_code),
          city: clean(stop?.city),
          state: "",
          zipCode: clean(stop?.zip_code),
          lat: toNumber(stop?.latitude),
          lng: toNumber(stop?.longitude),
          status: clean(stop?.status) || "scheduled",
          notes: clean(stop?.notes),
          priority: "normal",
          durationMinutes: Number(stop?.duration_minutes || schedulingConfig?.defaultDurationMins || 60),
          routeOrder: stopIds.length + 1,
          source: clean(stop?.source),
          classification: clean(stop?.classification),
          planningClassification: clean(stop?.planning_classification),
          dueDate: clean(stop?.due_date),
          dueDateFlexDays: Number(stop?.due_date_flex_days || 0),
          dueDateDeviationDays: Number(stop?.due_date_deviation_days || 0),
          routeGroup: clean(stop?.route_group),
          continuityRecentTechnicians: Array.isArray(stop?.continuity_recent_technicians)
            ? stop.continuity_recent_technicians
            : [],
          requiredSkills: Array.isArray(stop?.required_skills) ? stop.required_skills : [],
          officeId: clean(stop?.office_id),
          serviceDay,
          currentStart,
          currentEnd,
          currentRouteId: "",
          currentRouteTitle: "Unassigned",
          currentTechnicianId: "",
          currentTechnicianName: "Unassigned",
          currentTechnicianRole: "",
          currentFieldroutesTechnicianId: "",
          proposedStart: currentStart,
          proposedEnd: currentEnd,
          proposedRouteId: "",
          proposedRouteTitle: "Unassigned",
          proposedTechnicianId: "",
          proposedTechnicianName: "Unassigned",
          proposedFieldroutesTechnicianId: "",
          preferenceDetails: {
            preferred_days: Array.isArray(stop?.preferred_days) ? stop.preferred_days : [],
            preferred_time_window:
              stop?.preferred_time_window && typeof stop.preferred_time_window === "object"
                ? stop.preferred_time_window
                : {},
            access_instructions: Array.isArray(stop?.access_instructions)
              ? stop.access_instructions
              : [],
          },
          classificationReasons: Array.isArray(stop?.classification_reasons)
            ? stop.classification_reasons
            : [],
          metadata: stop?.metadata && typeof stop.metadata === "object" ? stop.metadata : {},
        };
        stopIds.push(appointmentId);
      });

      if (!stopIds.length) return;
      const anchorStart =
        routeStops
          .map((stop) => toDate(stop?.scheduled_start))
          .filter(Boolean)
          .sort((left, right) => left - right)[0] || startOfDay(serviceDay);
      routesById[routeId] = {
        id: routeId,
        serviceDay,
        technicianId: "",
        technicianName: "Unassigned",
        technicianRole: "",
        fieldroutesTechnicianId: "",
        routeTitle: "Unassigned",
        officeId: clean(routeStops[0]?.office_id),
        officeName: "",
        routeColor: "#94a3b8",
        home: null,
        capacityMinutes: 0,
        anchorStart: toIsoString(anchorStart),
        stopIds,
        baselineTravelMinutes: 0,
        baselineTravelMiles: 0,
        baselineRevenue: routeStops.reduce(
          (total, stop) => total + Number(stop?.estimated_value || 0),
          0
        ),
        baselinePathPoints: [],
        baselineRouteEfficiencyScore: 0,
        routeStart: clean(routeStops[0]?.scheduled_start),
        routeEnd: clean(routeStops[routeStops.length - 1]?.scheduled_end),
        statusCounts: {},
        completionRate: 0,
        routeDensity: 0,
        syncStatus: "synced",
        lockState: "",
        roleLabel: clean(schedulingConfig?.staffLabel),
      };
      routeOrder.unshift(routeId);
    });
  }

  return {
    day: clean(board?.day) || clean(day),
    window: board?.target_window || fallbackWindow,
    viewMode: clean(board?.view_mode) || "day",
    payloadVersion: clean(board?.payload_version),
    historical: Boolean(board?.historical),
    dateRangeMeta:
      board?.date_range_meta && typeof board.date_range_meta === "object"
        ? board.date_range_meta
        : {},
    statusCounts:
      board?.status_counts && typeof board.status_counts === "object"
        ? board.status_counts
        : {},
    routeUtilization: Array.isArray(board?.route_utilization) ? board.route_utilization : [],
    metrics: board?.metrics && typeof board.metrics === "object" ? board.metrics : {},
    summary: board?.summary && typeof board.summary === "object" ? board.summary : {},
    sync: board?.sync && typeof board.sync === "object" ? board.sync : {},
    generatedAt: clean(board?.generated_at),
    days: Array.isArray(board?.days) ? board.days : [],
    routeOrder,
    routesById,
    appointmentsById,
  };
};

export const buildDispatchState = ({
  board,
  day,
  schedules,
  serviceTypes,
  schedulingConfig,
}) => {
  const hasSnapshotRoutes =
    Array.isArray(board?.baseline_items) ||
    (Array.isArray(board?.routes) &&
      board.routes.some((route) =>
        Array.isArray(route?.stops)
          ? route.stops.some(
              (stop) =>
                stop?.fieldroutes_appointment_id !== undefined ||
                stop?.scheduled_start !== undefined ||
                stop?.planning_classification !== undefined
            )
          : false
      ));

  if (hasSnapshotRoutes) {
    return buildSnapshotDispatchState({ board, day, schedulingConfig });
  }

  const scheduleRows = Array.isArray(schedules) ? schedules : [];
  const serviceRows = Array.isArray(serviceTypes) ? serviceTypes : [];
  const scheduleById = new Map(scheduleRows.map((row) => [clean(row?.id), row]));
  const serviceById = new Map(serviceRows.map((row) => [clean(row?.id), row]));

  const appointmentsById = {};
  const routesById = {};
  const routeOrder = [];

  const normalizeStops = (stops, route) => {
    const draftStops = (Array.isArray(stops) ? stops : []).map((stop) => {
      const scheduleId = clean(stop?.schedule_id);
      const schedule = scheduleById.get(scheduleId) || null;
      const metadata = schedule?.metadata && typeof schedule.metadata === "object" ? schedule.metadata : {};
      const currentStart = stop?.service_window_start || schedule?.scheduled_start || "";
      const currentEnd = stop?.service_window_end || schedule?.scheduled_end || "";
      const serviceTypeId = clean(schedule?.service_type);
      const serviceName =
        clean(serviceById.get(serviceTypeId)?.name) ||
        clean(schedule?.service_type_name) ||
        clean(schedule?.offering_name) ||
        clean(schedule?.offering?.name) ||
        clean(schedule?.notes) ||
        clean(route?.serviceLabel) ||
        "Service";
      const customerName = clean(stop?.customer_name) || clean(schedule?.customer_name) || "Customer";
      const position = getPosition({
        lat: stop?.lat,
        lng: stop?.lng,
        dest_lat: schedule?.dest_lat,
        dest_lng: schedule?.dest_lng,
      });

      return {
        id: scheduleId,
        crmAppointmentId: scheduleId,
        externalId:
          clean(metadata?.fieldroutes_appointment_id) ||
          clean(metadata?.fieldroutes_external_id) ||
          scheduleId,
        fieldroutesAppointmentId:
          clean(metadata?.fieldroutes_appointment_id) ||
          clean(metadata?.fieldroutes_external_id) ||
          "",
        customerId: clean(stop?.customer_id || schedule?.customer),
        customerName,
        lastName: lastName(customerName),
        serviceName,
        value: Number(stop?.revenue_value || metadata?.revenue_value || 0),
        address: joinAddress(stop?.address, stop?.city, stop?.state, stop?.zip_code),
        city: clean(stop?.city),
        state: clean(stop?.state),
        zipCode: clean(stop?.zip_code),
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        status: clean(schedule?.status) || "scheduled",
        notes: clean(schedule?.notes),
        priority: clean(stop?.priority || schedule?.priority) || "normal",
        durationMinutes: getDurationMinutes(schedule, stop, schedulingConfig?.defaultDurationMins),
        routeOrder: Number(stop?.route_order || 0),
        currentStart,
        currentEnd,
        currentRouteId: clean(metadata?.fieldroutes_route_id),
        currentTechnicianId: clean(route?.technician_id || schedule?.assigned_technician),
        currentTechnicianName:
          clean(route?.technician_name) || clean(schedule?.assigned_technician_name) || "Unassigned",
        currentFieldroutesTechnicianId: clean(metadata?.fieldroutes_technician_id),
        proposedStart: currentStart,
        proposedEnd: currentEnd,
        proposedRouteId: clean(metadata?.fieldroutes_route_id),
        proposedTechnicianId: clean(route?.technician_id || schedule?.assigned_technician),
        proposedTechnicianName:
          clean(route?.technician_name) || clean(schedule?.assigned_technician_name) || "Unassigned",
        proposedFieldroutesTechnicianId: clean(metadata?.fieldroutes_technician_id),
        preferenceDetails: getPreferenceDetails(metadata),
        metadata,
      };
    });

    const routeFieldroutesTechnicianId =
      draftStops.map((stop) => clean(stop.currentFieldroutesTechnicianId)).find(Boolean) || "";
    return draftStops.map((stop) => ({
      ...stop,
      proposedFieldroutesTechnicianId: stop.currentFieldroutesTechnicianId || routeFieldroutesTechnicianId,
    }));
  };

  const createRoute = (route, fallbackId = "unassigned") => {
    const routeId = `route-${clean(route?.technician_id) || fallbackId}`;
    const appointments = normalizeStops(route?.stops, route);
    appointments.forEach((appointment, index) => {
      appointmentsById[appointment.id] = {
        ...appointment,
        routeId,
        routeOrder: index + 1,
      };
    });

    const anchorStart =
      appointments
        .map((appointment) => toDate(appointment.currentStart))
        .filter(Boolean)
        .sort((left, right) => left - right)[0] || startOfDay(day);

    const routeFieldroutesTechnicianId =
      appointments.map((appointment) => clean(appointment.currentFieldroutesTechnicianId)).find(Boolean) || "";

    routesById[routeId] = {
      id: routeId,
      technicianId: clean(route?.technician_id),
      technicianName: clean(route?.technician_name) || "Unassigned",
      technicianRole: clean(route?.technician_role),
      fieldroutesTechnicianId: routeFieldroutesTechnicianId,
      routeColor: clean(route?.route_color) || "#1d4ed8",
      home: getPosition(route?.home),
      capacityMinutes: Number(route?.capacity_minutes || 0),
      anchorStart: toIsoString(anchorStart),
      stopIds: appointments.map((appointment) => appointment.id),
      baselineTravelMinutes: Number(route?.travel_minutes || 0),
      baselineTravelMiles: Number(route?.travel_miles || 0),
      baselineRevenue: Number(route?.route_revenue || 0),
      roleLabel: clean(route?.technician_role) || clean(schedulingConfig?.staffLabel),
    };

    routeOrder.push(routeId);
  };

  (board?.routes || []).forEach((route) => createRoute(route));
  createRoute(
    {
      technician_id: "",
      technician_name: "Unassigned",
      technician_role: "",
      route_color: "#94a3b8",
      home: null,
      capacity_minutes: 0,
      travel_minutes: 0,
      travel_miles: 0,
      route_revenue: 0,
      stops: board?.unassigned || [],
    },
    "unassigned"
  );

  return {
    day: clean(board?.day) || clean(day),
    window: {
      start_date: clean(board?.day) || clean(day),
      end_date: clean(board?.day) || clean(day),
    },
    viewMode: "day",
    payloadVersion: clean(board?.payload_version),
    historical: Boolean(board?.historical),
    dateRangeMeta:
      board?.date_range_meta && typeof board.date_range_meta === "object"
        ? board.date_range_meta
        : {},
    statusCounts:
      board?.status_counts && typeof board.status_counts === "object"
        ? board.status_counts
        : {},
    routeUtilization: Array.isArray(board?.route_utilization) ? board.route_utilization : [],
    metrics: board?.metrics && typeof board.metrics === "object" ? board.metrics : {},
    summary: board?.summary && typeof board.summary === "object" ? board.summary : {},
    sync: board?.sync && typeof board.sync === "object" ? board.sync : {},
    generatedAt: clean(board?.generated_at),
    days: Array.isArray(board?.days) ? board.days : [],
    routeOrder,
    routesById,
    appointmentsById,
  };
};

const buildPathMetrics = (route, stops) => {
  const pathPoints = [];
  let travelMiles = 0;
  let travelMinutes = 0;

  const home = route?.home;
  if (home?.lat != null && home?.lng != null) {
    pathPoints.push({
      id: `${route.id}-home`,
      type: "home",
      position: home,
      label: route.technicianName,
    });
  }

  let previousPoint = home?.lat != null && home?.lng != null ? home : null;
  stops.forEach((stop, index) => {
    const position = getPosition(stop);
    if (!position) return;
    if (previousPoint) {
      const segmentMiles = haversineMiles(previousPoint, position);
      travelMiles += segmentMiles;
      travelMinutes += estimateTravelMinutes(segmentMiles);
    }
    pathPoints.push({
      id: stop.id,
      type: "appointment",
      position,
      label: stop.customerName,
      order: index + 1,
    });
    previousPoint = position;
  });

  return {
    pathPoints,
    travelMiles: Number(travelMiles.toFixed(1)),
    travelMinutes,
  };
};

export const buildRouteViewModels = (state, constraints) => {
  if (!state) return [];
  return state.routeOrder.map((routeId) => {
    const route = state.routesById[routeId];
    const stops = route.stopIds
      .map((appointmentId) => state.appointmentsById[appointmentId])
      .filter(Boolean);
    const scheduledMinutes = stops.reduce(
      (total, stop) => total + Number(stop.durationMinutes || 0),
      0
    );
    const routeRevenue = stops.reduce((total, stop) => total + Number(stop.value || 0), 0);
    const hasLocalChanges = stops.some(isAppointmentModified);
    const derivedPathMetrics = buildPathMetrics(route, stops);
    const pathPoints =
      !hasLocalChanges && Array.isArray(route.baselinePathPoints) && route.baselinePathPoints.length
        ? route.baselinePathPoints
        : derivedPathMetrics.pathPoints;
    const travelMiles =
      !hasLocalChanges && Number(route.baselineTravelMiles || 0) > 0
        ? Number(route.baselineTravelMiles || 0)
        : derivedPathMetrics.travelMiles;
    const travelMinutes =
      !hasLocalChanges && Number(route.baselineTravelMinutes || 0) > 0
        ? Number(route.baselineTravelMinutes || 0)
        : derivedPathMetrics.travelMinutes;
    const capacityMinutes = Number(route.capacityMinutes || 0);
    const utilizationPct =
      capacityMinutes > 0 ? Math.min(100, Math.round((scheduledMinutes / capacityMinutes) * 100)) : 0;
    const routeMinutes = scheduledMinutes + travelMinutes;
    const warnings = [];
    const maxAppointments = Number(constraints?.maxAppointmentsPerTech || 0);
    const maxDriveMinutes = Number(
      constraints?.maxDriveMinutes ?? constraints?.maxRouteTime ?? 0
    );
    const valueTarget = Number(constraints?.valueTarget || 0);

    if (maxAppointments > 0 && stops.length > maxAppointments) {
      warnings.push("Max appointments");
    }
    if (maxDriveMinutes > 0 && travelMinutes > maxDriveMinutes) {
      warnings.push("Drive limit");
    }
    if (valueTarget > 0 && routeRevenue < valueTarget) {
      warnings.push("Value target");
    }

    return {
      ...route,
      stops,
      modified: hasLocalChanges,
      routeStart: clean(route.routeStart || stops[0]?.proposedStart || stops[0]?.currentStart),
      routeEnd: clean(
        route.routeEnd || stops[stops.length - 1]?.proposedEnd || stops[stops.length - 1]?.currentEnd
      ),
      statusCounts:
        route.statusCounts && typeof route.statusCounts === "object" ? route.statusCounts : {},
      completionRate: Number(route.completionRate || 0),
      routeDensity: Number(route.routeDensity || 0),
      metrics: {
        totalStops: stops.length,
        scheduledMinutes,
        routeRevenue,
        capacityMinutes,
        utilizationPct,
        openCapacityMinutes: Math.max(capacityMinutes - scheduledMinutes, 0),
        travelMiles,
        travelMinutes,
        routeMinutes,
      },
      warnings,
      pathPoints,
      timelineEntries: buildTimelineEntries(route, stops),
    };
  });
};

export const buildTimelineEntries = (route, stops = []) => {
  const orderedStops = Array.isArray(stops) ? stops : [];
  const entries = [];
  let previousEnd = null;

  orderedStops.forEach((appointment, index) => {
    const start = appointment?.proposedStart || appointment?.currentStart;
    const end = appointment?.proposedEnd || appointment?.currentEnd;
    const deltaMinutes = previousEnd ? diffMinutes(start, previousEnd) : 0;

    if (index > 0 && deltaMinutes > 0) {
      entries.push({
        id: `${route?.id || "route"}-gap-${appointment.id}`,
        type: "gap",
        minutes: deltaMinutes,
        start,
        end: previousEnd,
      });
    } else if (index > 0 && deltaMinutes < 0) {
      entries.push({
        id: `${route?.id || "route"}-overlap-${appointment.id}`,
        type: "overlap",
        minutes: Math.abs(deltaMinutes),
        start,
        end: previousEnd,
      });
    }

    entries.push({
      id: appointment.id,
      type: "appointment",
      appointment,
    });
    previousEnd = end || previousEnd;
  });

  return entries;
};

export const buildDaySummaries = (state) => {
  if (!state) return [];
  const dayMap = new Map(
    (Array.isArray(state.days) ? state.days : [])
      .map((day) => ({
      date: clean(day?.date),
      routeCount: Number(day?.route_count || 0),
      stopCount: Number(day?.stop_count || 0),
      scheduledMinutes: Number(day?.scheduled_minutes || 0),
      driveMinutes: Number(day?.drive_minutes || 0),
      completionRate: Number(day?.completion_rate || 0),
      routeDensity: Number(day?.route_density || 0),
      statusCounts:
        day?.status_counts && typeof day.status_counts === "object" ? day.status_counts : {},
    }))
      .filter((day) => day.date)
      .map((day) => [day.date, day])
  );

  const startDate = clean(state?.dateRangeMeta?.start_date || state?.window?.start_date);
  const endDate = clean(state?.dateRangeMeta?.end_date || state?.window?.end_date);
  const windowDates = enumerateDays(startDate, endDate);
  if (!windowDates.length) {
    return Array.from(dayMap.values()).sort((left, right) => left.date.localeCompare(right.date));
  }

  return windowDates.map((date) => {
    if (dayMap.has(date)) return dayMap.get(date);
    return {
      date,
      routeCount: 0,
      stopCount: 0,
      scheduledMinutes: 0,
      driveMinutes: 0,
      completionRate: 0,
      routeDensity: 0,
      statusCounts: {
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        canceled: 0,
        other: 0,
      },
    };
  });
};

const resequenceRoute = (state, routeId) => {
  const route = state.routesById[routeId];
  if (!route) return;

  let cursor = toDate(route.anchorStart) || startOfDay(state.day);
  let previousPoint = route.home?.lat != null && route.home?.lng != null ? route.home : null;

  route.stopIds.forEach((appointmentId, index) => {
    const appointment = state.appointmentsById[appointmentId];
    if (!appointment) return;
    const position = getPosition(appointment);
    const gapMinutes =
      index === 0
        ? 0
        : Math.max(
            MIN_BUFFER_MINUTES,
            previousPoint && position ? estimateTravelMinutes(haversineMiles(previousPoint, position)) : 0
          );
    const nextStart = index === 0 ? cursor : addMinutes(cursor, gapMinutes);
    const nextEnd = addMinutes(nextStart, appointment.durationMinutes || 60);

    state.appointmentsById[appointmentId] = {
      ...appointment,
      routeId,
      routeOrder: index + 1,
      proposedStart: toIsoString(nextStart),
      proposedEnd: toIsoString(nextEnd),
      proposedTechnicianId: clean(route.technicianId),
      proposedTechnicianName: clean(route.technicianName) || "Unassigned",
      proposedFieldroutesTechnicianId: clean(route.fieldroutesTechnicianId),
    };

    cursor = nextEnd;
    if (position) previousPoint = position;
  });
};

export const moveAppointment = (
  state,
  { appointmentId, sourceRouteId, targetRouteId, targetIndex }
) => {
  if (!state || !appointmentId || !sourceRouteId || !targetRouteId) return state;
  const sourceRoute = state.routesById[sourceRouteId];
  const targetRoute = state.routesById[targetRouteId];
  if (!sourceRoute || !targetRoute) return state;

  const sourceIndex = sourceRoute.stopIds.indexOf(appointmentId);
  if (sourceIndex === -1) return state;

  const nextState = {
    ...state,
    routesById: {
      ...state.routesById,
      [sourceRouteId]: { ...sourceRoute, stopIds: [...sourceRoute.stopIds] },
      [targetRouteId]: {
        ...targetRoute,
        stopIds:
          sourceRouteId === targetRouteId ? [...sourceRoute.stopIds] : [...targetRoute.stopIds],
      },
    },
    appointmentsById: { ...state.appointmentsById },
  };

  nextState.routesById[sourceRouteId].stopIds.splice(sourceIndex, 1);

  let insertionIndex = Number.isInteger(targetIndex)
    ? targetIndex
    : nextState.routesById[targetRouteId].stopIds.length;
  if (sourceRouteId === targetRouteId && sourceIndex < insertionIndex) {
    insertionIndex -= 1;
  }
  insertionIndex = Math.max(0, Math.min(insertionIndex, nextState.routesById[targetRouteId].stopIds.length));
  nextState.routesById[targetRouteId].stopIds.splice(insertionIndex, 0, appointmentId);

  resequenceRoute(nextState, sourceRouteId);
  if (targetRouteId !== sourceRouteId) {
    resequenceRoute(nextState, targetRouteId);
  }

  return nextState;
};

export const buildApplyPayload = (state, selectedAppointmentIds = []) => {
  if (!state) {
    return {
      mode: "apply_selected",
      items: [],
      selected_ids: [],
      target_window: {},
    };
  }

  const selectedSet = new Set((Array.isArray(selectedAppointmentIds) ? selectedAppointmentIds : []).map(clean));

  const items = Object.values(state.appointmentsById)
    .filter(isAppointmentModified)
    .filter((appointment) => !selectedSet.size || selectedSet.has(clean(appointment.id)))
    .sort((left, right) => {
      const a = clean(left.proposedStart);
      const b = clean(right.proposedStart);
      return a.localeCompare(b);
    })
    .map((appointment) => {
      const dayDelta = diffDays(appointment.proposedStart, appointment.currentStart);
      const technicianChanged =
        clean(appointment.proposedFieldroutesTechnicianId || appointment.proposedTechnicianId) !==
        clean(appointment.currentFieldroutesTechnicianId || appointment.currentTechnicianId);
      const reordered =
        clean(appointment.proposedStart) !== clean(appointment.currentStart) ||
        clean(appointment.proposedEnd) !== clean(appointment.currentEnd);
      const reasonCodes = ["dispatcher_manual_adjustment"];
      if (technicianChanged) reasonCodes.push("cross_route_move");
      if (reordered) reasonCodes.push("route_resequence");

      return {
        external_id: clean(appointment.externalId || appointment.crmAppointmentId),
        fieldroutes_appointment_id: clean(appointment.fieldroutesAppointmentId),
        crm_appointment_id: clean(appointment.crmAppointmentId),
        customer_name: appointment.customerName,
        current_start: appointment.currentStart,
        current_end: appointment.currentEnd,
        current_technician_id: clean(
          appointment.currentFieldroutesTechnicianId || appointment.currentTechnicianId
        ),
        current_technician_name: appointment.currentTechnicianName,
        current_route_id: clean(appointment.currentRouteId),
        proposed_start: appointment.proposedStart,
        proposed_end: appointment.proposedEnd,
        proposed_technician_id: clean(
          appointment.proposedFieldroutesTechnicianId || appointment.proposedTechnicianId
        ),
        proposed_technician_name: appointment.proposedTechnicianName,
        proposed_route_id: clean(appointment.proposedRouteId),
        reason: technicianChanged
          ? "Dispatcher moved this appointment to another route."
          : "Dispatcher reordered the route sequence.",
        reason_codes: reasonCodes,
        cadence_safe: dayDelta === 0,
        continuity_preserved: !technicianChanged,
        preference_respected: true,
        technician_changed: technicianChanged,
        day_delta: Math.abs(dayDelta),
        classification: clean(appointment.classification) || "FLEXIBLE",
        preference_details: appointment.preferenceDetails,
        service_type: appointment.serviceName,
      };
    });

  return {
    mode: "apply_selected",
    items,
    selected_ids: items.map((item) => clean(item.external_id || item.crm_appointment_id)),
    target_window: state.window || {
      start_date: clean(state.day),
      end_date: clean(state.day),
    },
  };
};

export const buildConstraintPayload = (constraints = {}) => ({
  max_appointments_per_tech: Number(constraints.maxAppointmentsPerTech || 0),
  max_drive_minutes: Number(
    constraints.maxDriveMinutes ?? constraints.maxRouteTime ?? 0
  ),
  min_value_per_route: Number(constraints.valueTarget || 0),
  max_due_date_deviation:
    constraints.maxDueDateDeviation === "" || constraints.maxDueDateDeviation == null
      ? null
      : Number(constraints.maxDueDateDeviation || 0),
  balance_routes: Boolean(constraints.balanceRoutes),
  priorities: {
    drive: Number(constraints.priorities?.drive || 0),
    value: Number(constraints.priorities?.value || 0),
    cadence: Number(constraints.priorities?.cadence || 0),
  },
});

export const filterPlanItemsByWindow = (planItems = [], targetWindow = {}) => {
  const start = clean(targetWindow?.start_date);
  const end = clean(targetWindow?.end_date);
  if (!start || !end) return Array.isArray(planItems) ? [...planItems] : [];
  const startValue = toDate(`${start}T00:00:00`);
  const endValue = toDate(`${end}T23:59:59`);
  return (Array.isArray(planItems) ? planItems : []).filter((item) => {
    const proposed = toDate(item?.proposed_start || item?.current_start);
    if (!proposed || !startValue || !endValue) return false;
    return proposed >= startValue && proposed <= endValue;
  });
};

const stableColorForKey = (key) => {
  const palette = ["#1d4ed8", "#0f766e", "#d97706", "#7c3aed", "#b91c1c", "#0369a1"];
  const normalized = clean(key) || "route";
  const hash = normalized.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const routeKeyCandidates = (route = {}) =>
  [route.fieldroutesTechnicianId, route.technicianId, route.technicianName]
    .map(clean)
    .filter(Boolean);

const appointmentPlanCandidates = (appointment = {}) =>
  [
    appointment.crmAppointmentId,
    appointment.externalId,
    appointment.fieldroutesAppointmentId,
    appointment.id,
  ]
    .map(clean)
    .filter(Boolean);

const ensurePreviewRoute = (state, appointment, item) => {
  const preferredTechId = clean(item?.proposed_technician_id || item?.current_technician_id);
  const preferredTechName =
    clean(item?.proposed_technician_name || item?.current_technician_name) || "Unassigned";
  const previewDay = clean(
    (item?.proposed_start || appointment?.proposedStart || appointment?.currentStart || "").slice(0, 10)
  );
  const existingRouteId = state.routeOrder.find((routeId) => {
    const route = state.routesById[routeId];
    if (!route) return false;
    return (
      clean(route.serviceDay || state.day) === previewDay &&
      (routeKeyCandidates(route).includes(preferredTechId) || clean(route.technicianName) === preferredTechName)
    );
  });
  if (existingRouteId) return existingRouteId;

  const previewRouteId = `route-preview-${previewDay || clean(state.day)}-${preferredTechId || preferredTechName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unassigned"}`;
  if (state.routesById[previewRouteId]) return previewRouteId;

  state.routesById[previewRouteId] = {
    id: previewRouteId,
    serviceDay: previewDay || clean(state.day),
    technicianId: "",
    technicianName: preferredTechName,
    technicianRole: appointment?.metadata?.crew_type || appointment?.currentTechnicianRole || "",
    fieldroutesTechnicianId: preferredTechId,
    routeColor: stableColorForKey(preferredTechId || preferredTechName),
    home: null,
    capacityMinutes: 0,
    anchorStart: toIsoString(startOfDay(previewDay || state.day)),
    stopIds: [],
    baselineTravelMinutes: 0,
    baselineTravelMiles: 0,
    baselineRevenue: 0,
    baselinePathPoints: [],
    roleLabel: appointment?.metadata?.crew_type || "",
  };
  state.routeOrder = [...state.routeOrder, previewRouteId];
  return previewRouteId;
};

export const overlayOptimizationPlan = (state, planItems = []) => {
  if (!state) return state;
  const normalizedPlanItems = Array.isArray(planItems) ? planItems : [];
  const planByKey = new Map();
  normalizedPlanItems.forEach((item) => {
    [
      item?.crm_appointment_id,
      item?.external_id,
      item?.fieldroutes_appointment_id,
      item?.item_id,
    ]
      .map(clean)
      .filter(Boolean)
      .forEach((key) => {
        if (!planByKey.has(key)) planByKey.set(key, item);
      });
  });

  const nextState = {
    ...state,
    routeOrder: [...state.routeOrder],
    routesById: Object.fromEntries(
      Object.entries(state.routesById || {}).map(([routeId, route]) => [
        routeId,
        { ...route, stopIds: [] },
      ])
    ),
    appointmentsById: { ...state.appointmentsById },
  };

  Object.values(state.appointmentsById || {}).forEach((appointment) => {
    const matchingPlan =
      appointmentPlanCandidates(appointment)
        .map((candidate) => planByKey.get(candidate))
        .find(Boolean) || null;
    const nextAppointment = { ...appointment };
    if (matchingPlan) {
      nextAppointment.proposedStart = matchingPlan.proposed_start || nextAppointment.proposedStart;
      nextAppointment.proposedEnd = matchingPlan.proposed_end || nextAppointment.proposedEnd;
      nextAppointment.proposedTechnicianName =
        clean(matchingPlan.proposed_technician_name) || nextAppointment.proposedTechnicianName;
      nextAppointment.proposedFieldroutesTechnicianId =
        clean(matchingPlan.proposed_technician_id) || nextAppointment.proposedFieldroutesTechnicianId;
      nextAppointment.proposedRouteId =
        clean(matchingPlan.proposed_route_id) || nextAppointment.proposedRouteId;
      nextAppointment.optimizationPreview = matchingPlan;
      nextAppointment.optimizationReason = clean(matchingPlan.reason);
      nextAppointment.optimizationReasonCodes = Array.isArray(matchingPlan.reason_codes)
        ? matchingPlan.reason_codes
        : [];
      nextAppointment.dueDateDeviationDays = Number(
        matchingPlan.due_date_deviation_days ?? nextAppointment.dueDateDeviationDays ?? 0
      );
    }

    const proposedInWindow = matchingPlan
      ? withinWindow(matchingPlan?.proposed_start || nextAppointment.currentStart, state.window)
      : true;
    nextAppointment.optimizationOutOfWindow = Boolean(matchingPlan && !proposedInWindow);

    const routeId =
      matchingPlan && proposedInWindow
        ? ensurePreviewRoute(nextState, nextAppointment, matchingPlan)
        : nextAppointment.routeId;
    nextAppointment.routeId = routeId;
    nextState.appointmentsById[appointment.id] = nextAppointment;

    if (nextState.routesById[routeId]) {
      nextState.routesById[routeId].stopIds.push(appointment.id);
    }
  });

  nextState.routeOrder = nextState.routeOrder.filter((routeId) => nextState.routesById[routeId]);
  nextState.routeOrder.forEach((routeId) => {
    const route = nextState.routesById[routeId];
    route.stopIds = route.stopIds
      .filter((appointmentId) => nextState.appointmentsById[appointmentId])
      .sort((leftId, rightId) => {
        const left = clean(nextState.appointmentsById[leftId]?.proposedStart);
        const right = clean(nextState.appointmentsById[rightId]?.proposedStart);
        return left.localeCompare(right);
      });
    route.stopIds.forEach((appointmentId, index) => {
      const appointment = nextState.appointmentsById[appointmentId];
      if (!appointment) return;
      nextState.appointmentsById[appointmentId] = {
        ...appointment,
        routeId,
        routeOrder: index + 1,
      };
    });
  });

  return nextState;
};
