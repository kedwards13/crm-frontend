import { buildDaySummaries, buildDispatchState, buildTimelineEntries, overlayOptimizationPlan } from "./utils";

const board = {
  payload_version: "2026.04.dispatch_baseline.1",
  day: "2026-04-02",
  view_mode: "range",
  historical: false,
  date_range_meta: {
    anchor_day: "2026-04-02",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    total_days: 30,
    historical: false,
  },
  target_window: {
    start_date: "2026-04-01",
    end_date: "2026-04-30",
  },
  status_counts: {
    scheduled: 1,
    in_progress: 0,
    completed: 1,
    canceled: 0,
    other: 0,
  },
  route_utilization: [
    {
      route_key: "route-2026-04-02-81",
      service_day: "2026-04-02",
      technician_id: "81",
      total_stops: 1,
      scheduled_minutes: 60,
      drive_minutes: 42,
    },
  ],
  days: [
    {
      date: "2026-04-02",
      route_count: 1,
      stop_count: 1,
      scheduled_minutes: 60,
      drive_minutes: 42,
      completion_rate: 0,
      route_density: 0.8,
      status_counts: {
        scheduled: 1,
        in_progress: 0,
        completed: 0,
        canceled: 0,
        other: 0,
      },
    },
    {
      date: "2026-04-03",
      route_count: 1,
      stop_count: 1,
      scheduled_minutes: 60,
      drive_minutes: 30,
      completion_rate: 1,
      route_density: 1,
      status_counts: {
        scheduled: 0,
        in_progress: 0,
        completed: 1,
        canceled: 0,
        other: 0,
      },
    },
  ],
  routes: [
    {
      id: "route-2026-04-02-81",
      service_day: "2026-04-02",
      technician_id: "81",
      fieldroutes_technician_id: "81",
      technician_name: "Tech Alpha",
      technician_role: "tech",
      route_id: "r-1",
      route_title: "Alpha Route",
      route_color: "#1d4ed8",
      drive_minutes: 42,
      distance_miles: 18.5,
      route_revenue: 275,
      route_start: "2026-04-02T09:00:00Z",
      route_end: "2026-04-02T10:00:00Z",
      status_counts: { scheduled: 1, in_progress: 0, completed: 0, canceled: 0, other: 0 },
      completion_rate: 0,
      route_density: 0.8,
      path_points: [],
      stops: [
        {
          id: "appt-1001",
          external_id: "1001",
          fieldroutes_appointment_id: "1001",
          crm_appointment_id: "501",
          customer_id: "c-1",
          customer_name: "Taylor Homeowner",
          scheduled_start: "2026-04-02T09:00:00Z",
          scheduled_end: "2026-04-02T10:00:00Z",
          technician_id: "81",
          technician_name: "Tech Alpha",
          route_id: "r-1",
          route_title: "Alpha Route",
          duration_minutes: 60,
          service_type: "General Pest",
          status: "scheduled",
          notes: "Call ahead",
          latitude: 26.6,
          longitude: -81.9,
          city: "Cape Coral",
          zip_code: "33914",
          source: "fieldroutes",
          classification: "FLEXIBLE",
          planning_classification: "recurring",
          due_date: "2026-04-02",
          due_date_flex_days: 3,
          due_date_deviation_days: 0,
          route_group: "",
          continuity_recent_technicians: ["81", "81"],
          required_skills: ["general pest"],
          preferred_days: ["Friday"],
          preferred_time_window: { start: "15:00" },
          access_instructions: [],
          metadata: {},
        },
      ],
    },
    {
      id: "route-2026-04-03-82",
      service_day: "2026-04-03",
      technician_id: "82",
      fieldroutes_technician_id: "82",
      technician_name: "Tech Bravo",
      technician_role: "tech",
      route_id: "r-2",
      route_title: "Bravo Route",
      route_color: "#0f766e",
      drive_minutes: 30,
      distance_miles: 10.2,
      route_revenue: 180,
      route_start: "2026-04-03T11:00:00Z",
      route_end: "2026-04-03T12:00:00Z",
      status_counts: { scheduled: 0, in_progress: 0, completed: 1, canceled: 0, other: 0 },
      completion_rate: 1,
      route_density: 1,
      path_points: [],
      stops: [
        {
          id: "appt-1002",
          external_id: "1002",
          fieldroutes_appointment_id: "1002",
          crm_appointment_id: "502",
          customer_id: "c-2",
          customer_name: "Morgan Customer",
          scheduled_start: "2026-04-03T11:00:00Z",
          scheduled_end: "2026-04-03T12:00:00Z",
          technician_id: "82",
          technician_name: "Tech Bravo",
          route_id: "r-2",
          route_title: "Bravo Route",
          duration_minutes: 60,
          service_type: "Inspection",
          status: "scheduled",
          notes: "",
          latitude: 26.7,
          longitude: -81.95,
          city: "Fort Myers",
          zip_code: "33901",
          source: "fieldroutes",
          classification: "LOCKED",
          planning_classification: "reactive",
          due_date: "",
          due_date_flex_days: 0,
          due_date_deviation_days: 0,
          route_group: "",
          continuity_recent_technicians: [],
          required_skills: ["inspection"],
          preferred_days: [],
          preferred_time_window: {},
          access_instructions: [],
          classification_reasons: ["within_48_hours"],
          metadata: {},
        },
      ],
    },
  ],
};

describe("dispatch baseline state", () => {
  test("buildDispatchState keeps baseline routes and appointments without optimizer preview", () => {
    const state = buildDispatchState({
      board,
      day: "2026-04-02",
      schedules: [],
      serviceTypes: [],
      schedulingConfig: {},
    });

    expect(state.window).toEqual({
      start_date: "2026-04-01",
      end_date: "2026-04-30",
    });
    expect(state.dateRangeMeta.total_days).toBe(30);
    expect(state.statusCounts.completed).toBe(1);
    expect(state.routeOrder).toHaveLength(2);
    expect(Object.keys(state.appointmentsById)).toEqual(
      expect.arrayContaining(["appt-1001", "appt-1002"])
    );
    expect(state.routesById["route-2026-04-03-82"].serviceDay).toBe("2026-04-03");
  });

  test("overlayOptimizationPlan does not remove unchanged baseline rows", () => {
    const baselineState = buildDispatchState({
      board,
      day: "2026-04-02",
      schedules: [],
      serviceTypes: [],
      schedulingConfig: {},
    });

    const nextState = overlayOptimizationPlan(baselineState, [
      {
        external_id: "1001",
        crm_appointment_id: "501",
        fieldroutes_appointment_id: "1001",
        proposed_start: "2026-04-04T09:00:00Z",
        proposed_end: "2026-04-04T10:00:00Z",
        proposed_technician_id: "81",
        proposed_technician_name: "Tech Alpha",
        proposed_route_id: "r-4",
        reason: "Optimizer move",
        reason_codes: ["cadence_alignment"],
        due_date_deviation_days: 2,
      },
    ]);

    expect(nextState.appointmentsById["appt-1001"].proposedStart).toBe("2026-04-04T09:00:00Z");
    expect(nextState.appointmentsById["appt-1002"]).toBeDefined();
    expect(nextState.appointmentsById["appt-1002"].routeId).toBe("route-2026-04-03-82");
    expect(nextState.routesById["route-2026-04-03-82"].stopIds).toContain("appt-1002");
  });

  test("buildDaySummaries pads empty calendar days while preserving backend counts", () => {
    const state = buildDispatchState({
      board,
      day: "2026-04-02",
      schedules: [],
      serviceTypes: [],
      schedulingConfig: {},
    });

    const summaries = buildDaySummaries(state);
    expect(summaries).toHaveLength(30);
    expect(summaries[0].date).toBe("2026-04-01");
    expect(summaries[0].routeCount).toBe(0);
    expect(summaries[1].date).toBe("2026-04-02");
    expect(summaries[2].statusCounts.completed).toBe(1);
  });

  test("buildTimelineEntries preserves visual gaps between stops", () => {
    const route = { id: "route-1" };
    const entries = buildTimelineEntries(route, [
      {
        id: "appt-1",
        proposedStart: "2026-04-02T09:00:00Z",
        proposedEnd: "2026-04-02T10:00:00Z",
      },
      {
        id: "appt-2",
        proposedStart: "2026-04-02T10:30:00Z",
        proposedEnd: "2026-04-02T11:00:00Z",
      },
    ]);

    expect(entries.map((entry) => entry.type)).toEqual(["appointment", "gap", "appointment"]);
    expect(entries[1].minutes).toBe(30);
  });

  test("buildDispatchState creates a visible unassigned lane for orphaned stops", () => {
    const state = buildDispatchState({
      board: {
        ...board,
        routes: [],
        baseline_items: [],
        unassigned: [
          {
            id: "orphan-stop",
            external_id: "2001",
            fieldroutes_appointment_id: "2001",
            customer_id: "c-9",
            customer_name: "Unassigned Customer",
            scheduled_start: "2026-04-05T13:00:00Z",
            scheduled_end: "2026-04-05T14:00:00Z",
            duration_minutes: 60,
            service_type: "Callback",
            status: "scheduled",
            city: "Cape Coral",
            zip_code: "33914",
            source: "fieldroutes",
            classification: "FLEXIBLE",
            planning_classification: "scheduled",
          },
        ],
      },
      day: "2026-04-05",
      schedules: [],
      serviceTypes: [],
      schedulingConfig: {},
    });

    expect(state.routeOrder[0]).toBe("route-unassigned-2026-04-05");
    expect(state.routesById["route-unassigned-2026-04-05"].technicianName).toBe("Unassigned");
    expect(state.appointmentsById["orphan-stop"]).toBeDefined();
  });
});
