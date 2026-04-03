import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Bell,
  CalendarRange,
  FileText,
  MapPinned,
  RefreshCw,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { getIndustryKey, getSchedulingConfig } from "../../../constants/uiRegistry";
import { getDispatchRegistry } from "./dispatchRegistry";
import {
  applyOptimizationPlan,
  getDispatchBoard,
  optimizeWithConstraints,
} from "../../../api/schedulingApi";
import MapView from "./MapView";
import ConstraintPanel from "./ConstraintPanel";
import {
  buildApplyPayload,
  buildConstraintPayload,
  buildDaySummaries,
  buildDispatchState,
  buildRouteViewModels,
  clean,
  filterPlanItemsByWindow,
  formatCurrency,
  formatDayLabel,
  formatDateTime,
  formatHours,
  formatTime,
  getExecutionKeyCandidates,
  getVisualState,
  isAppointmentModified,
  moveAppointment,
  overlayOptimizationPlan,
} from "./utils";
import StatusIndicator from "./StatusIndicator";
import { computeRouteSchedule } from "./utils/schedule";
import "../RoutePlanner.css";

const todayIso = () => new Date().toISOString().slice(0, 10);

const shiftIsoDate = (value, amount) => {
  const base = new Date(`${clean(value) || todayIso()}T12:00:00`);
  base.setDate(base.getDate() + Number(amount || 0));
  return base.toISOString().slice(0, 10);
};

const shiftIsoMonth = (value, amount) => {
  const base = new Date(`${clean(value) || todayIso()}T12:00:00`);
  base.setMonth(base.getMonth() + Number(amount || 0));
  return base.toISOString().slice(0, 10);
};

const countWindowDays = (startDate, endDate) => {
  const start = new Date(`${clean(startDate) || todayIso()}T12:00:00`);
  const end = new Date(`${clean(endDate) || clean(startDate) || todayIso()}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
};

const formatNavigationDate = (value) => {
  const parsed = new Date(`${clean(value) || todayIso()}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Select date";
  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value));

const toWeekWindow = (day) => {
  const anchor = new Date(`${clean(day) || todayIso()}T12:00:00`);
  const weekday = anchor.getDay();
  const diffToMonday = (weekday + 6) % 7;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
};

const readApiError = (error, fallback) =>
  clean(error?.response?.data?.detail || error?.response?.data?.error || error?.message) ||
  fallback;

const resolveViewMode = (pathname) => {
  const normalized = clean(pathname).toLowerCase();
  if (normalized.endsWith("/month")) return "month";
  if (normalized.endsWith("/range")) return "range";
  return "day";
};

const validateDispatchRequest = ({ viewMode, day, rangeStart, rangeEnd }) => {
  if (!isIsoDate(day)) {
    return "Select a valid ISO date before loading the dispatch board.";
  }
  if (viewMode === "day") {
    return "";
  }
  if (viewMode === "month") {
    return "";
  }
  if (!isIsoDate(rangeStart) || !isIsoDate(rangeEnd)) {
    return "Range view requires a valid start date and end date.";
  }
  if (rangeStart > rangeEnd) {
    return "Range start must be on or before the range end date.";
  }
  return "";
};

const validateDispatchResponse = (board) => {
  if (!board || typeof board !== "object") {
    throw new Error("Dispatch board response was empty.");
  }
  if (!Array.isArray(board.routes)) {
    throw new Error("Dispatch board response is missing routes.");
  }
  if (!Array.isArray(board.baseline_items)) {
    throw new Error("Dispatch board response is missing baseline items.");
  }
  if (!board.date_range_meta || typeof board.date_range_meta !== "object") {
    throw new Error("Dispatch board response is missing date range metadata.");
  }
  return board;
};

const toViewWindow = (viewMode, day, rangeStart, rangeEnd) => {
  const anchor = new Date(`${clean(day) || new Date().toISOString().slice(0, 10)}T12:00:00`);
  if (viewMode === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    };
  }
  if (viewMode === "range") {
    const start = clean(rangeStart) || clean(day);
    const end = clean(rangeEnd) || start;
    return { start_date: start, end_date: end };
  }
  return {
    start_date: clean(day),
    end_date: clean(day),
  };
};

const DEFAULT_CONSTRAINTS = {
  maxAppointmentsPerTech: 12,
  maxDriveMinutes: 300,
  valueTarget: 1200,
  maxDueDateDeviation: "",
  balanceRoutes: true,
  priorities: {
    drive: 0.4,
    value: 0.4,
    cadence: 0.2,
  },
};

const buildExecutionMap = (report) => {
  const map = new Map();
  (report?.results || []).forEach((row) => {
    [row?.crm_appointment_id, row?.external_id, row?.fieldroutes_appointment_id, row?.item_id]
      .map(clean)
      .filter(Boolean)
      .forEach((key) => map.set(key, row));
  });
  return map;
};

const toMonthWindow = (day) => {
  const base = new Date(`${clean(day) || new Date().toISOString().slice(0, 10)}T12:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return {
    monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    label: start.toLocaleDateString([], { month: "long", year: "numeric" }),
    targetWindow: {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    },
  };
};

const routeKeyForDay = (technicianId, day) =>
  `${clean(technicianId) || "unassigned"}:${clean(day)}`;

const appendLocalDraftRoutes = (state, localRouteDrafts = []) => {
  if (!state || !localRouteDrafts.length) return state;
  const nextState = {
    ...state,
    routeOrder: Array.isArray(state.routeOrder) ? [...state.routeOrder] : [],
    routesById: { ...(state.routesById || {}) },
  };

  localRouteDrafts.forEach((route) => {
    const routeId = clean(route?.id);
    if (!routeId || nextState.routesById[routeId]) return;
    nextState.routesById[routeId] = route;
    nextState.routeOrder.push(routeId);
  });

  return nextState;
};

const buildRouteStatusMap = (executionReport, auditReport) => {
  const routeStatuses = new Map(
    Object.entries(auditReport?.sync_status_by_route || {}).map(([key, value]) => [clean(key), clean(value)])
  );
  (executionReport?.results || []).forEach((row) => {
    const requested = row?.requested || {};
    const previous = row?.previous || {};
    const start = clean(requested?.start || previous?.start).slice(0, 10);
    const technicianId =
      clean(requested?.technician_id || previous?.technician_id) || "unassigned";
    if (!start) return;
    const routeKey = routeKeyForDay(technicianId, start);
    const current = routeStatuses.get(routeKey);
    if (current === "drift") return;
    if (row?.outcome === "drift_detected" || row?.reconciliation_status === "drift_detected") {
      routeStatuses.set(routeKey, "drift");
      return;
    }
    if (
      row?.outcome === "partial_sync" ||
      row?.reconciliation_status === "fieldroutes_unverified"
    ) {
      routeStatuses.set(routeKey, "partial");
      return;
    }
    if (!current && row?.outcome === "applied") {
      routeStatuses.set(routeKey, "synced");
    }
  });
  return routeStatuses;
};

export default function RouteBoard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [industryKey, setIndustryKey] = useState(() => getIndustryKey("general"));
  const schedulingConfig = useMemo(() => getSchedulingConfig(industryKey), [industryKey]);
  const dispatchRegistry = useMemo(() => getDispatchRegistry(industryKey), [industryKey]);
  const RouteColumn = dispatchRegistry.RouteColumn;
  const staffLabel = schedulingConfig?.staffLabel || "Technician";
  const initialDay = todayIso();
  const viewMode = useMemo(() => resolveViewMode(location.pathname), [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [applyLoading, setApplyLoading] = useState(false);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [error, setError] = useState("");
  const [day, setDay] = useState(initialDay);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [showJobPool, setShowJobPool] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dispatchState, setDispatchState] = useState(null);
  const [baselineState, setBaselineState] = useState(null);
  const [boardMeta, setBoardMeta] = useState(null);
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedForApplyIds, setSelectedForApplyIds] = useState([]);
  const [executionReport, setExecutionReport] = useState(null);
  const [optimizationPlan, setOptimizationPlan] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState("");
  const [highlightedRouteId, setHighlightedRouteId] = useState("");
  const [localRouteDrafts, setLocalRouteDrafts] = useState([]);
  const requestIdRef = useRef(0);
  const highlightTimeoutRef = useRef(null);
  const routeRefs = useRef(new Map());
  const previousViewModeRef = useRef(viewMode);
  const dayPickerRef = useRef(null);
  const loadWindow = useMemo(
    () => toViewWindow(viewMode, day, rangeStart, rangeEnd),
    [day, rangeEnd, rangeStart, viewMode]
  );
  const monthWindow = useMemo(() => toMonthWindow(day), [day]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadBoard = useCallback(async ({ refresh = false } = {}) => {
    const validationError = validateDispatchRequest({
      viewMode,
      day,
      rangeStart,
      rangeEnd,
    });
    if (validationError) {
      requestIdRef.current += 1;
      setLoading(false);
      setError(validationError);
      setDispatchState(null);
      setBaselineState(null);
      setBoardMeta(null);
      setSelectedAppointmentId("");
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setDispatchState(null);
    setBaselineState(null);
    setBoardMeta(null);
    try {
      const boardRes = await getDispatchBoard({
        day,
        view: viewMode,
        start_date: loadWindow.start_date,
        end_date: loadWindow.end_date,
        include_opportunities: true,
        refresh,
      });
      if (requestId !== requestIdRef.current) return;
      const board = validateDispatchResponse(boardRes?.data || {});
      const nextState = buildDispatchState({
        board,
        day,
        schedules: [],
        serviceTypes: [],
        schedulingConfig,
      });

      if (requestId !== requestIdRef.current) return;
      setBaselineState(nextState);
      setBoardMeta(board);
      setSelectedForApplyIds([]);

      const firstAppointmentId = nextState.routeOrder
        .flatMap((routeId) => nextState.routesById[routeId]?.stopIds || [])
        .find(Boolean);

      setSelectedAppointmentId((current) =>
        current && nextState.appointmentsById[current] ? current : firstAppointmentId || ""
      );
    } catch (nextError) {
      if (requestId !== requestIdRef.current) return;
      setError(readApiError(nextError, "Unable to load the dispatch board."));
      setDispatchState(null);
      setBaselineState(null);
      setBoardMeta(null);
      setSelectedAppointmentId("");
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
    }
  }, [day, loadWindow.end_date, loadWindow.start_date, rangeEnd, rangeStart, schedulingConfig, viewMode]);

  useEffect(() => {
    setExecutionReport(null);
    setSelectedForApplyIds([]);
    setLocalRouteDrafts([]);
  }, [day, loadWindow.end_date, loadWindow.start_date, viewMode]);

  useEffect(() => {
    const previousViewMode = previousViewModeRef.current;
    if (
      viewMode === "range" &&
      previousViewMode !== "range" &&
      !clean(rangeStart) &&
      !clean(rangeEnd)
    ) {
      const nextWeekWindow = toWeekWindow(day);
      setRangeStart(nextWeekWindow.start_date);
      setRangeEnd(nextWeekWindow.end_date);
    }
    previousViewModeRef.current = viewMode;
  }, [day, rangeEnd, rangeStart, viewMode]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!baselineState) {
      setDispatchState(null);
      return;
    }
    const visiblePlanItems = filterPlanItemsByWindow(
      optimizationPlan?.plan_items || [],
      baselineState.window || loadWindow
    );
    const nextState = optimizationPlan?.plan_items?.length
      ? overlayOptimizationPlan(baselineState, visiblePlanItems)
      : baselineState;
    setDispatchState(appendLocalDraftRoutes(nextState, localRouteDrafts));
  }, [baselineState, loadWindow, localRouteDrafts, optimizationPlan]);

  useEffect(() => {
    const updateIndustry = () => setIndustryKey(getIndustryKey("general"));
    const onStorage = (event) => {
      if (event.key === "activeTenant" || event.key === "ui_overrides") {
        updateIndustry();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("activeTenant:changed", updateIndustry);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("activeTenant:changed", updateIndustry);
    };
  }, []);

  const executionByKey = useMemo(() => buildExecutionMap(executionReport), [executionReport]);
  const routeStatusByKey = useMemo(
    () => buildRouteStatusMap(executionReport, auditReport),
    [auditReport, executionReport]
  );
  const routeDeltaByKey = useMemo(() => {
    const nextMap = new Map();
    (optimizationPlan?.route_deltas || []).forEach((row) => {
      nextMap.set(routeKeyForDay(row?.technician_id, row?.service_day), row);
    });
    return nextMap;
  }, [optimizationPlan]);
  const boardStateMeta = dispatchState || baselineState || null;
  const syncMeta = boardMeta?.sync || boardStateMeta?.sync || {};
  const dateRangeMeta = boardMeta?.date_range_meta || boardStateMeta?.dateRangeMeta || {};
  const overallStatusCounts = boardMeta?.status_counts || boardStateMeta?.statusCounts || {};
  const daySummaries = useMemo(() => buildDaySummaries(boardStateMeta), [boardStateMeta]);

  const routes = useMemo(() => {
    return buildRouteViewModels(dispatchState, constraints).map((route) => {
      const routeKey = routeKeyForDay(
        route.fieldroutesTechnicianId || route.technicianId,
        route.serviceDay || dispatchState?.day
      );
      return {
        ...route,
        routeDelta: routeDeltaByKey.get(routeKey) || null,
        syncStatus: routeStatusByKey.get(routeKey) || route.syncStatus || "",
      };
    });
  }, [constraints, dispatchState, routeDeltaByKey, routeStatusByKey]);
  const scheduledRoutes = useMemo(
    () =>
      routes.map((route) => ({
        ...route,
        stops: computeRouteSchedule(route.stops || []),
      })),
    [routes]
  );
  const deferredRoutes = useDeferredValue(scheduledRoutes);
  const scheduledAppointmentsById = useMemo(() => {
    const nextMap = new Map();
    scheduledRoutes.forEach((route) => {
      (route.stops || []).forEach((appointment) => {
        nextMap.set(clean(appointment.id), appointment);
      });
    });
    return nextMap;
  }, [scheduledRoutes]);

  const routeDayGroups = useMemo(() => {
    const groups = new Map();
    deferredRoutes.forEach((route) => {
      const serviceDay = clean(route.serviceDay || dispatchState?.day);
      if (!groups.has(serviceDay)) {
        groups.set(serviceDay, {
          day: serviceDay,
          routes: [],
        });
      }
      groups.get(serviceDay).routes.push(route);
    });
    const summaryByDay = new Map((daySummaries || []).map((summary) => [clean(summary.date), summary]));
    const orderedDays = daySummaries.length
      ? daySummaries.map((summary) => clean(summary.date))
      : Array.from(groups.keys()).sort((left, right) => left.localeCompare(right));

    return orderedDays.map((serviceDay) => ({
      day: serviceDay,
      routes: groups.get(serviceDay)?.routes || [],
      summary: summaryByDay.get(serviceDay) || null,
    }));
  }, [daySummaries, deferredRoutes, dispatchState?.day]);

  const modifiedAppointments = useMemo(
    () =>
      dispatchState
        ? Object.values(dispatchState.appointmentsById).filter(isAppointmentModified)
        : [],
    [dispatchState]
  );

  const routeAlertCount = useMemo(
    () => routes.filter((route) => route.warnings.length > 0).length,
    [routes]
  );

  const selectedModifiedCount = useMemo(() => {
    const selectedSet = new Set(selectedForApplyIds.map(clean));
    return modifiedAppointments.filter((appointment) => selectedSet.has(clean(appointment.id))).length;
  }, [modifiedAppointments, selectedForApplyIds]);

  const executionSummary = executionReport?.summary || {};
  const optimizationSummary = optimizationPlan?.summary || {};
  const optimizationWindowLabel = optimizationPlan?.target_window
    ? `${optimizationPlan.target_window.start_date} → ${optimizationPlan.target_window.end_date}`
    : "Next 60 days";
  const monthlyPlanItems = useMemo(
    () => filterPlanItemsByWindow(optimizationPlan?.plan_items || [], monthWindow.targetWindow),
    [monthWindow, optimizationPlan]
  );
  const visibleRouteDeltas = useMemo(
    () =>
      (optimizationPlan?.route_deltas || []).filter((row) => {
        const serviceDay = clean(row?.service_day);
        if (!serviceDay) return false;
        if (viewMode === "day") {
          return serviceDay === clean(day);
        }
        return serviceDay >= clean(loadWindow.start_date) && serviceDay <= clean(loadWindow.end_date);
      }),
    [day, loadWindow.end_date, loadWindow.start_date, optimizationPlan, viewMode]
  );
  const auditSummary = auditReport?.summary || {};

  const boardSummary = useMemo(() => {
    const totalStops = routes.reduce((total, route) => total + route.metrics.totalStops, 0);
    const routeMinutes = routes.reduce((total, route) => total + route.metrics.routeMinutes, 0);
    const routeRevenue = routes.reduce((total, route) => total + route.metrics.routeRevenue, 0);
    return {
      routes: routes.length,
      stops: totalStops,
      routeMinutes,
      routeRevenue,
      modified: modifiedAppointments.length,
      selected: selectedModifiedCount,
    };
  }, [modifiedAppointments.length, routes, selectedModifiedCount]);

  const selectedAppointment = useMemo(() => {
    if (!dispatchState || !selectedAppointmentId) return null;
    return dispatchState.appointmentsById[selectedAppointmentId] || null;
  }, [dispatchState, selectedAppointmentId]);
  const selectedAppointmentView = useMemo(() => {
    if (!selectedAppointment) return null;
    return scheduledAppointmentsById.get(clean(selectedAppointment.id)) || selectedAppointment;
  }, [scheduledAppointmentsById, selectedAppointment]);

  const selectedExecution = useMemo(() => {
    if (!selectedAppointment) return null;
    return (
      getExecutionKeyCandidates(selectedAppointment)
        .map((key) => executionByKey.get(key))
        .find(Boolean) || null
    );
  }, [executionByKey, selectedAppointment]);

  useEffect(() => {
    if (!selectedAppointment) {
      setDetailOpen(false);
    }
  }, [selectedAppointment]);

  const hasBoardData = Boolean(boardStateMeta);
  const syncStatusLabel =
    clean(syncMeta?.status) === "synced"
      ? "Live (FieldRoutes)"
      : clean(syncMeta?.status) === "error"
        ? "Sync Error"
        : "Snapshot (cached)";
  const navigationLabel =
    viewMode === "month"
      ? monthWindow.label
      : viewMode === "range"
        ? `${formatNavigationDate(loadWindow.start_date)} - ${formatNavigationDate(loadWindow.end_date)}`
        : formatNavigationDate(day);
  const routeSignals = useMemo(
    () =>
      (boardMeta?.routes || []).flatMap((route) =>
        (route?.opportunities || []).map((signal, index) => ({
          id: `${clean(route?.id || route?.route_key || route?.route_id)}:${index}`,
          routeId: clean(route?.id || route?.route_key || route?.route_id),
          routeTitle: clean(route?.route_title),
          technicianName: clean(route?.technician_name) || "Unassigned",
          serviceDay: clean(route?.service_day),
          type: clean(signal?.type),
          recommendedAction: clean(signal?.recommended_action),
          reason: clean(signal?.reason),
        }))
      ),
    [boardMeta]
  );
  const jobPoolRoutes = useMemo(
    () => scheduledRoutes.filter((route) => !clean(route.technicianId)),
    [scheduledRoutes]
  );

  const shiftVisibleWindow = useCallback(
    (amount) => {
      if (viewMode === "month") {
        setDay((current) => shiftIsoMonth(current, amount));
        return;
      }

      if (viewMode === "range") {
        const span = countWindowDays(rangeStart || day, rangeEnd || rangeStart || day);
        const nextStart = shiftIsoDate(rangeStart || day, amount);
        setRangeStart(nextStart);
        setRangeEnd(shiftIsoDate(nextStart, span));
        setDay(nextStart);
        return;
      }

      setDay((current) => shiftIsoDate(current, amount));
    },
    [day, rangeEnd, rangeStart, viewMode]
  );

  const handleJumpDate = useCallback(
    (nextDate) => {
      if (!isIsoDate(nextDate)) return;
      if (viewMode === "range") {
        const span = countWindowDays(rangeStart || day, rangeEnd || rangeStart || day);
        setRangeStart(nextDate);
        setRangeEnd(shiftIsoDate(nextDate, span));
      }
      setDay(nextDate);
    },
    [day, rangeEnd, rangeStart, viewMode]
  );

  const handleSignalSelect = useCallback((signal) => {
    const routeId = clean(signal?.routeId);
    if (!routeId) return;
    setHighlightedRouteId(routeId);
    const element = routeRefs.current.get(routeId);
    if (element?.scrollIntoView) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedRouteId("");
      highlightTimeoutRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleReset = useCallback(() => {
    if (!baselineState) {
      setDispatchState(null);
      return;
    }
    const visiblePlanItems = filterPlanItemsByWindow(
      optimizationPlan?.plan_items || [],
      baselineState.window || loadWindow
    );
    setDispatchState(
      appendLocalDraftRoutes(
        optimizationPlan?.plan_items?.length
          ? overlayOptimizationPlan(baselineState, visiblePlanItems)
          : baselineState,
        localRouteDrafts
      )
    );
    setExecutionReport(null);
    setSelectedForApplyIds([]);
  }, [baselineState, loadWindow, localRouteDrafts, optimizationPlan]);

  const handleSelectAppointment = useCallback((appointment) => {
    setSelectedAppointmentId(clean(appointment?.id));
  }, []);

  const handleDragStart = useCallback((event) => {
    setActiveAppointmentId(clean(event?.active?.id));
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      setActiveAppointmentId("");
      if (!dispatchState) return;

      const activeId = clean(event?.active?.id);
      const activeRouteId = clean(event?.active?.data?.current?.routeId);
      const over = event?.over;
      if (!activeId || !activeRouteId || !over) return;

      const overType = clean(over?.data?.current?.type);
      const targetRouteId =
        clean(over?.data?.current?.routeId) ||
        (overType === "route" ? clean(over?.id) : "");
      if (!targetRouteId) return;

      const targetRoute = dispatchState.routesById[targetRouteId];
      if (!targetRoute) return;

      const overAppointmentId = overType === "appointment" ? clean(over.id) : "";
      const overIndex = overAppointmentId ? targetRoute.stopIds.indexOf(overAppointmentId) : targetRoute.stopIds.length;

      setDispatchState((current) =>
        moveAppointment(current, {
          appointmentId: activeId,
          sourceRouteId: activeRouteId,
          targetRouteId,
          targetIndex: overIndex,
        })
      );
      setSelectedForApplyIds((current) =>
        current.includes(activeId) ? current : [...current, activeId]
      );
      setSelectedAppointmentId(activeId);
    },
    [dispatchState]
  );

  const handleToggleApplySelection = useCallback((appointmentId) => {
    const normalizedId = clean(appointmentId);
    if (!normalizedId) return;
    setSelectedForApplyIds((current) =>
      current.includes(normalizedId)
        ? current.filter((value) => value !== normalizedId)
        : [...current, normalizedId]
    );
  }, []);

  useEffect(() => {
    if (!dispatchState) {
      setSelectedForApplyIds([]);
      return;
    }
    const modifiedIds = new Set(
      Object.values(dispatchState.appointmentsById)
        .filter(isAppointmentModified)
        .map((appointment) => clean(appointment.id))
    );
    setSelectedForApplyIds((current) => current.filter((id) => modifiedIds.has(clean(id))));
  }, [dispatchState]);

  const handleApply = useCallback(async () => {
    if (!dispatchState) return;
    const payload = buildApplyPayload(dispatchState, selectedForApplyIds);
    if (!payload.items.length) return;

    setApplyLoading(true);
    setError("");
    try {
      const response = await applyOptimizationPlan(payload);
      setExecutionReport(response?.data || null);
      setAuditReport(null);
      setSelectedForApplyIds([]);
      if (optimizationPlan) setOptimizationPlan(null);
      await loadBoard();
    } catch (applyError) {
      setError(readApiError(applyError, "Unable to apply dispatch changes."));
    } finally {
      setApplyLoading(false);
    }
  }, [dispatchState, loadBoard, optimizationPlan, selectedForApplyIds]);

  const handleOptimize = useCallback(async () => {
    setOptimizationLoading(true);
    setError("");
    try {
      const response = await optimizeWithConstraints({
        mode: "full",
        constraints: buildConstraintPayload(constraints),
      });
      setOptimizationPlan(response?.data || null);
      setExecutionReport(null);
      setAuditReport(null);
      setSelectedForApplyIds([]);
    } catch (nextError) {
      setError(readApiError(nextError, "Unable to build an optimization preview."));
    } finally {
      setOptimizationLoading(false);
    }
  }, [constraints]);

  const handleClearPreview = useCallback(() => {
    setOptimizationPlan(null);
    setAuditReport(null);
    setSelectedForApplyIds([]);
  }, []);

  const activeAppointment = useMemo(() => {
    if (!dispatchState || !activeAppointmentId) return null;
    return dispatchState.appointmentsById[activeAppointmentId] || null;
  }, [activeAppointmentId, dispatchState]);
  const activeAppointmentView = useMemo(() => {
    if (!activeAppointment) return null;
    return scheduledAppointmentsById.get(clean(activeAppointment.id)) || activeAppointment;
  }, [activeAppointment, scheduledAppointmentsById]);

  return (
    <div className="dispatch-shell">
      <header className="dispatch-topbar">
        <div className="dispatch-date-nav" aria-label="Schedule date navigation">
          <button
            type="button"
            className="dispatch-date-nav-btn"
            onClick={() => shiftVisibleWindow(-1)}
            aria-label="Previous schedule window"
          >
            &larr;
          </button>
          <button
            type="button"
            className="dispatch-date-display"
            onClick={() => {
              if (dayPickerRef.current?.showPicker) {
                dayPickerRef.current.showPicker();
                return;
              }
              dayPickerRef.current?.click();
            }}
          >
            {navigationLabel}
          </button>
          <input
            ref={dayPickerRef}
            className="dispatch-date-picker"
            type="date"
            value={day}
            onChange={(event) => handleJumpDate(event.target.value)}
            aria-label="Jump to schedule date"
          />
          <button
            type="button"
            className="dispatch-date-nav-btn"
            onClick={() => shiftVisibleWindow(1)}
            aria-label="Next schedule window"
          >
            &rarr;
          </button>
        </div>

        <div className="dispatch-actions" aria-label="Primary dispatch actions">
          <button
            type="button"
            className="dispatch-button secondary"
            onClick={() => navigate("/schedule/planner")}
          >
            <CalendarRange size={14} />
            Month Planner
          </button>
          <button
            type="button"
            className="dispatch-button secondary"
            onClick={handleOptimize}
            disabled={optimizationLoading || loading}
          >
            <Sparkles size={14} />
            {optimizationLoading ? "Optimizing…" : "Optimize"}
          </button>
          <button
            type="button"
            className={`dispatch-button secondary ${constraintsOpen ? "is-active" : ""}`}
            onClick={() => setConstraintsOpen(true)}
          >
            <SlidersHorizontal size={14} />
            Constraints
          </button>
          <button
            type="button"
            className="dispatch-button primary"
            onClick={handleApply}
            disabled={!selectedModifiedCount || applyLoading}
          >
            <Send size={14} />
            {applyLoading ? "Applying…" : "Apply"}
          </button>
        </div>
      </header>

      <section className="dispatch-toggles" aria-label="Dispatch display toggles">
        <button
          type="button"
          className={`dispatch-toggle-pill ${showJobPool ? "is-active" : ""}`}
          onClick={() => setShowJobPool((current) => !current)}
        >
          Job Pool
        </button>
        <button
          type="button"
          className={`dispatch-toggle-pill ${showMap ? "is-active" : ""}`}
          onClick={() => setShowMap((current) => !current)}
          disabled={!hasBoardData}
        >
          <MapPinned size={14} />
          Map
        </button>
        <button
          type="button"
          className={`dispatch-toggle-pill ${showReminders ? "is-active" : ""}`}
          onClick={() => setShowReminders((current) => !current)}
        >
          <Bell size={14} />
          Reminders
        </button>
        {optimizationPlan ? (
          <button
            type="button"
            className="dispatch-toggle-pill"
            onClick={handleClearPreview}
          >
            <RotateCcw size={14} />
            Clear Preview
          </button>
        ) : null}
        {modifiedAppointments.length ? (
          <button
            type="button"
            className="dispatch-toggle-pill"
            onClick={handleReset}
          >
            <RefreshCw size={14} />
            Reset
          </button>
        ) : null}
        {selectedAppointment ? (
          <button
            type="button"
            className={`dispatch-toggle-pill ${detailOpen ? "is-active" : ""}`}
            onClick={() => setDetailOpen(true)}
          >
            <FileText size={14} />
            Inspect
          </button>
        ) : null}
      </section>

      <section className="dispatch-board-meta">
        <StatusIndicator
          kind="sync"
          value={syncMeta?.status || "stale"}
          label={syncStatusLabel}
          showLabel
        />
        {dateRangeMeta?.historical ? <StatusIndicator label="Historical window" showLabel /> : null}
        <span className="dispatch-board-meta-text">
          {dateRangeMeta?.start_date && dateRangeMeta?.end_date
            ? `${dateRangeMeta.start_date} → ${dateRangeMeta.end_date}`
            : `${loadWindow.start_date} → ${loadWindow.end_date}`}
        </span>
        {syncMeta?.last_synced_at ? (
          <span className="dispatch-board-meta-text">
            Last synced {formatDateTime(syncMeta.last_synced_at)}
          </span>
        ) : null}
      </section>

      {showReminders ? (
        <div className="dispatch-inline-status">
          Reminder automation remains backend-driven. The dispatch board reflects route state and
          changes, but reminder sends and suppression continue through the existing policy flow.
        </div>
      ) : null}

      {loading && !hasBoardData ? (
        <section className="dispatch-state-panel" aria-live="polite">
          <strong>Loading dispatch window…</strong>
          <p>Fetching the snapshot-backed routes for the selected window.</p>
        </section>
      ) : null}

      {error && !hasBoardData ? (
        <section className="dispatch-state-panel is-error" aria-live="assertive">
          <strong>Unable to load the dispatch board</strong>
          <p>{error}</p>
          <div className="dispatch-state-panel-actions">
            <button
              type="button"
              className="dispatch-button secondary"
              onClick={() => loadBoard({ refresh: true })}
            >
              <RefreshCw size={14} />
              Retry Live Refresh
            </button>
          </div>
        </section>
      ) : null}

      {hasBoardData ? (
        <section className="dispatch-summary-bar">
          <span>{boardSummary.routes} routes</span>
          <span className="dispatch-summary-sep">·</span>
          <span>{boardSummary.stops} stops</span>
          <span className="dispatch-summary-sep">·</span>
          <span>{formatHours(boardSummary.routeMinutes)}</span>
          <span className="dispatch-summary-sep">·</span>
          <span>{formatCurrency(boardSummary.routeRevenue)}</span>
          <span className="dispatch-summary-sep">·</span>
          <span>{overallStatusCounts.completed || 0}/{overallStatusCounts.scheduled || 0} scheduled</span>
        </section>
      ) : null}

      {hasBoardData && !boardSummary.routes && clean(syncMeta?.status) === "synced" ? (
        <div className="dispatch-inline-status">
          No routes returned for this window. This may indicate no scheduled work.
        </div>
      ) : null}

      {optimizationPlan ? (
        <section className="dispatch-plan-summary">
          <div className="dispatch-plan-summary-head">
            <div>
              <div className="dispatch-header-kicker">Optimizer Preview</div>
              <h3>
                {optimizationWindowLabel}
              </h3>
              <p>
                Preview generated by the constrained optimizer. Baseline routes stay visible for
                the loaded window, and preview changes are projected on top without replacing the
                underlying schedule.
              </p>
            </div>
            <div className="dispatch-plan-summary-badges">
              <span className="dispatch-result-chip">Moves {optimizationSummary.moves || 0}</span>
              <span className="dispatch-result-chip">
                Reassignments {optimizationSummary.reassignments || 0}
              </span>
              <span className="dispatch-result-chip is-skipped">
                Prevented {optimizationSummary.violations_prevented || 0}
              </span>
              <span className="dispatch-result-chip">
                Month items {monthlyPlanItems.length}
              </span>
            </div>
          </div>

          <div className="dispatch-plan-delta-grid">
            {visibleRouteDeltas.length ? (
              visibleRouteDeltas.map((row) => (
                <div
                  key={`${row.route_key}-${row.service_day}`}
                  className="dispatch-plan-delta-card"
                >
                  <span>{row.technician_name || "Route"}</span>
                  <strong>
                    {row.appointments_delta > 0 ? "+" : ""}
                    {row.appointments_delta} appointments
                  </strong>
                  <div>
                    {row.drive_minutes_delta > 0 ? "+" : ""}
                    {row.drive_minutes_delta} drive min
                  </div>
                  <div>
                    {row.distance_miles_delta > 0 ? "+" : row.distance_miles_delta < 0 ? "-" : ""}
                    {Math.abs(row.distance_miles_delta || 0).toFixed(1)} mi
                  </div>
                  <div>
                    {row.value_delta > 0 ? "+" : row.value_delta < 0 ? "-" : ""}
                    {formatCurrency(Math.abs(row.value_delta || 0))}
                    {row.value_delta < 0 ? " down" : " up"}
                  </div>
                  <div>{row.proposed_due_date_deviation_days || 0} due-day deviation</div>
                </div>
              ))
            ) : (
              <div className="dispatch-inline-status">
                No optimizer deltas land in the loaded window. Change the window controls to inspect
                another route slice from the active preview.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {error && hasBoardData ? <div className="dispatch-inline-status error">{error}</div> : null}
      {loading && hasBoardData ? <div className="dispatch-inline-status">Loading dispatch board…</div> : null}

      {executionReport ? (
        <section className="dispatch-result-bar">
          <div className="dispatch-result-chip is-applied">Applied {executionSummary.applied || 0}</div>
          <div className="dispatch-result-chip is-skipped">
            Skipped {(executionSummary.skipped || 0) + (executionSummary.blocked || 0)}
          </div>
          <div className="dispatch-result-chip is-failed">
            Failed {(executionSummary.failed || 0) + (executionSummary.partial_sync || 0) + (executionSummary.drift_detected || 0)}
          </div>
        </section>
      ) : null}

      {auditReport ? (
        <section className="dispatch-audit-bar">
          <div className="dispatch-result-chip">
            Audit total {auditSummary.total || 0}
          </div>
          <div className="dispatch-result-chip is-failed">
            Critical {auditSummary.critical || 0}
          </div>
          <div className="dispatch-result-chip is-skipped">
            Medium {auditSummary.medium || 0}
          </div>
          <div className="dispatch-result-chip">
            Minor {(auditSummary.high || 0) + (auditSummary.low || 0)}
          </div>
        </section>
      ) : null}

      {hasBoardData ? (
        <div className="dispatch-layout">
          <div className="dispatch-main">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="dispatch-route-day-groups">
                {!routeDayGroups.length && !loading ? (
                  <div className="dispatch-inline-status">
                    No routed appointments were returned for this window. The baseline schedule is still authoritative; widen the date range or run a live refresh if you expect FieldRoutes work here.
                  </div>
                ) : null}
                {routeDayGroups.map((group) => (
                  <section key={group.day} className="dispatch-route-day-section">
                    <header className="dispatch-route-day-head">
                      <div>
                        <div className="dispatch-header-kicker">Service Day</div>
                        <h3>{formatDayLabel(group.day)}</h3>
                      </div>
                      <div className="dispatch-route-day-meta">
                        {group.summary?.routeCount || group.routes.length} routes · {group.summary?.stopCount || 0} stops
                      </div>
                    </header>
                    <div className="dispatch-route-day-status">
                      {group.summary ? (
                        <>
                          <span className="dispatch-route-day-status-stat">
                            <StatusIndicator kind="appointment" value="completed" label="Completed" />
                            <span>{group.summary.statusCounts.completed || 0}</span>
                          </span>
                          <span className="dispatch-route-day-status-stat">
                            <StatusIndicator kind="appointment" value="scheduled" label="Scheduled" />
                            <span>{group.summary.statusCounts.scheduled || 0}</span>
                          </span>
                          <span className="dispatch-route-day-status-stat">
                            <StatusIndicator kind="appointment" value="in_progress" label="In progress" />
                            <span>{group.summary.statusCounts.in_progress || 0}</span>
                          </span>
                          {(group.summary.statusCounts.canceled || 0) > 0 ? (
                            <span className="dispatch-route-day-status-stat">
                              <StatusIndicator kind="appointment" value="canceled" label="Canceled" />
                              <span>{group.summary.statusCounts.canceled || 0}</span>
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <div className="dispatch-route-board">
                      {group.routes.map((route) => (
                        <div
                          key={route.id}
                          ref={(node) => {
                            if (node) {
                              routeRefs.current.set(route.id, node);
                            } else {
                              routeRefs.current.delete(route.id);
                            }
                          }}
                          className={highlightedRouteId === route.id ? "dispatch-route-highlight" : ""}
                        >
                          <RouteColumn
                            route={route}
                            staffLabel={staffLabel}
                            selectedAppointmentId={selectedAppointmentId}
                            selectedForApplyIds={selectedForApplyIds}
                            executionByKey={executionByKey}
                            syncStatus={route.syncStatus}
                            onSelectAppointment={handleSelectAppointment}
                            onToggleApplySelection={handleToggleApplySelection}
                            showReminders={showReminders}
                          />
                        </div>
                      ))}
                      {!group.routes.length ? (
                        <div className="dispatch-route-day-empty">
                          No routes scheduled for this day in the current snapshot window.
                        </div>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>

              <DragOverlay>
                {activeAppointmentView ? (
                  <div className="dispatch-pill dispatch-pill-overlay">
                    <div className="dispatch-pill-row">
                      <span className="dispatch-pill-time">
                        {activeAppointmentView.computedStart || formatTime(activeAppointmentView.proposedStart)}
                      </span>
                      <span className="dispatch-pill-copy">
                        <strong>{activeAppointmentView.lastName}</strong>
                      </span>
                      <span className="dispatch-pill-icons">
                        <StatusIndicator kind="execution" value="modified" label="Moving" />
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {showMap ? (
              <MapView
                routes={deferredRoutes}
                selectedAppointmentId={selectedAppointmentId}
                onSelectAppointment={handleSelectAppointment}
              />
            ) : null}

            {showJobPool ? (
              <section className="dispatch-signal-panel">
                <header className="dispatch-panel-head">
                  <div>
                    <h3>Job Pool</h3>
                    <p>Unassigned work and route signals surfaced from the existing dispatch API.</p>
                  </div>
                </header>
                <div className="dispatch-signal-list">
                  {jobPoolRoutes.length ? (
                    jobPoolRoutes.map((route) => (
                      <button
                        key={`job-pool-${route.id}`}
                        type="button"
                        className="dispatch-signal-card"
                        onClick={() =>
                          handleSignalSelect({
                            routeId: route.id,
                          })
                        }
                      >
                        <div className="dispatch-signal-head">
                          <strong>{route.routeTitle || "Unassigned"}</strong>
                          <span>{route.serviceDay || "Open window"}</span>
                        </div>
                        <div className="dispatch-signal-type">{route.metrics.totalStops} unassigned stops</div>
                        <div className="dispatch-signal-meta">Move work into a staffed route or add capacity.</div>
                      </button>
                    ))
                  ) : routeSignals.length ? (
                    routeSignals.slice(0, 24).map((signal) => (
                      <button
                        key={signal.id}
                        type="button"
                        className="dispatch-signal-card"
                        onClick={() => handleSignalSelect(signal)}
                      >
                        <div className="dispatch-signal-head">
                          <strong>{signal.technicianName}</strong>
                          <span>{signal.serviceDay || "Open window"}</span>
                        </div>
                        <div className="dispatch-signal-type">
                          {signal.type || signal.recommendedAction || "Opportunity"}
                        </div>
                        {signal.routeTitle ? (
                          <div className="dispatch-signal-meta">{signal.routeTitle}</div>
                        ) : null}
                        {signal.reason ? <div className="dispatch-signal-meta">{signal.reason}</div> : null}
                      </button>
                    ))
                  ) : (
                    <div className="dispatch-detail-empty">
                      No job pool items or route signals were returned for this window.
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {constraintsOpen ? (
        <div className="dispatch-modal" role="dialog" aria-modal="true" aria-label="Constraint panel">
          <div className="dispatch-modal-card">
            <header className="dispatch-modal-head">
              <div>
                <div className="dispatch-header-kicker">Optimizer Controls</div>
                <h3>Constraint Panel</h3>
              </div>
              <button
                type="button"
                className="dispatch-button secondary"
                onClick={() => setConstraintsOpen(false)}
                aria-label="Close constraint panel"
              >
                Close
              </button>
            </header>
            <div className="dispatch-modal-body">
              <ConstraintPanel
                constraints={constraints}
                onChange={setConstraints}
                modifiedCount={modifiedAppointments.length}
                routeAlertCount={routeAlertCount}
                optimizationWindowLabel={optimizationWindowLabel}
              />
            </div>
          </div>
          <button
            type="button"
            className="dispatch-modal-backdrop"
            onClick={() => setConstraintsOpen(false)}
            aria-label="Close constraint panel"
          />
        </div>
      ) : null}

      {detailOpen ? (
        <div className="dispatch-modal" role="dialog" aria-modal="true" aria-label="Appointment detail">
          <div className="dispatch-modal-card">
            <header className="dispatch-modal-head">
              <div>
                <div className="dispatch-header-kicker">Appointment Detail</div>
                <h3>{selectedAppointmentView?.customerName || "Selected appointment"}</h3>
              </div>
              <button
                type="button"
                className="dispatch-button secondary"
                onClick={() => setDetailOpen(false)}
                aria-label="Close appointment detail"
              >
                Close
              </button>
            </header>
            <div className="dispatch-modal-body">
              {selectedAppointmentView ? (
                <div className="dispatch-detail-body">
                  <div className="dispatch-detail-title-row">
                    <strong>{selectedAppointmentView.customerName}</strong>
                    <div className="dispatch-detail-title-tags">
                      <StatusIndicator
                        kind="execution"
                        value={getVisualState(selectedAppointment, selectedExecution)}
                        label={getVisualState(selectedAppointment, selectedExecution)}
                        showLabel
                      />
                      <StatusIndicator
                        kind="appointment"
                        value={selectedAppointmentView.status}
                        label={selectedAppointmentView.status || "scheduled"}
                        showLabel
                      />
                    </div>
                  </div>
                  <div className="dispatch-detail-grid">
                    <div>
                      <span>Service</span>
                      <strong>{selectedAppointmentView.serviceName}</strong>
                    </div>
                    <div>
                      <span>Value</span>
                      <strong>{formatCurrency(selectedAppointmentView.value)}</strong>
                    </div>
                    <div>
                      <span>Current Window</span>
                      <strong>
                        {selectedAppointmentView.computedStart || formatTime(selectedAppointmentView.currentStart)} -{" "}
                        {selectedAppointmentView.computedEnd || formatTime(selectedAppointmentView.currentEnd)}
                      </strong>
                    </div>
                    <div>
                      <span>Proposed Window</span>
                      <strong>
                        {selectedAppointmentView.computedStart || formatTime(selectedAppointmentView.proposedStart)} -{" "}
                        {selectedAppointmentView.computedEnd || formatTime(selectedAppointmentView.proposedEnd)}
                      </strong>
                    </div>
                    <div>
                      <span>Due Deviation</span>
                      <strong>{`\u00b1${selectedAppointmentView.dueDateDeviationDays || 0} days`}</strong>
                    </div>
                    <div>
                      <span>Queued For Apply</span>
                      <strong>{selectedForApplyIds.includes(clean(selectedAppointmentView.id)) ? "Yes" : "No"}</strong>
                    </div>
                    <div>
                      <span>Classification</span>
                      <strong>{selectedAppointmentView.classification || "FLEXIBLE"}</strong>
                    </div>
                    <div>
                      <span>Service Day</span>
                      <strong>{selectedAppointmentView.serviceDay || "—"}</strong>
                    </div>
                    <div>
                      <span>Current {staffLabel}</span>
                      <strong>{selectedAppointmentView.currentTechnicianName || "Unassigned"}</strong>
                    </div>
                    <div>
                      <span>Proposed {staffLabel}</span>
                      <strong>{selectedAppointmentView.proposedTechnicianName || "Unassigned"}</strong>
                    </div>
                  </div>

                  {selectedAppointmentView.address ? (
                    <div className="dispatch-detail-section">
                      <span>Address</span>
                      <strong>{selectedAppointmentView.address}</strong>
                    </div>
                  ) : null}

                  {selectedAppointmentView.notes ? (
                    <div className="dispatch-detail-section">
                      <span>Notes</span>
                      <strong>{selectedAppointmentView.notes}</strong>
                    </div>
                  ) : null}

                  {selectedAppointmentView.optimizationReason ? (
                    <div className="dispatch-detail-result">
                      <div className="dispatch-detail-section">
                        <span>Optimizer Reason</span>
                        <strong>{selectedAppointmentView.optimizationReason}</strong>
                      </div>
                      {selectedAppointmentView.optimizationReasonCodes?.length ? (
                        <div className="dispatch-detail-tags">
                          {selectedAppointmentView.optimizationReasonCodes.map((reason) => (
                            <span key={`${selectedAppointmentView.id}-opt-${reason}`} className="dispatch-detail-tag">
                              {reason.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedExecution ? (
                    <div className="dispatch-detail-result">
                      <div className="dispatch-detail-section">
                        <span>Execution Outcome</span>
                        <strong>{selectedExecution.outcome}</strong>
                      </div>
                      {selectedExecution.summary ? (
                        <div className="dispatch-detail-section">
                          <span>Summary</span>
                          <strong>{selectedExecution.summary}</strong>
                        </div>
                      ) : null}
                      {selectedExecution.reason_codes?.length ? (
                        <div className="dispatch-detail-tags">
                          {selectedExecution.reason_codes.map((reason) => (
                            <span key={`${selectedAppointment.id}-${reason}`} className="dispatch-detail-tag">
                              {reason.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {selectedExecution.actual_final_abon_state?.start ? (
                        <div className="dispatch-detail-section">
                          <span>Abon Final</span>
                          <strong>{formatDateTime(selectedExecution.actual_final_abon_state.start)}</strong>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="dispatch-detail-empty">Select an appointment to inspect it.</div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="dispatch-modal-backdrop"
            onClick={() => setDetailOpen(false)}
            aria-label="Close appointment detail"
          />
        </div>
      ) : null}
    </div>
  );
}
