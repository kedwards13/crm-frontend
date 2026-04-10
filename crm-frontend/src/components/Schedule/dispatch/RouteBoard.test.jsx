import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RouteBoard from "./RouteBoard";

jest.mock("../../../api/schedulingApi", () => ({
  getDispatchBoard: jest.fn(),
  optimizeWithConstraints: jest.fn(),
  applyOptimizationPlan: jest.fn(),
  finalizeSchedule: jest.fn(),
}));

const {
  getDispatchBoard,
  optimizeWithConstraints,
  applyOptimizationPlan,
  finalizeSchedule,
} = require("../../../api/schedulingApi");

const buildBoard = ({
  startDate,
  endDate,
  viewMode,
  day,
  routeId,
  technicianId,
  technicianName,
  stopId,
}) => ({
  payload_version: "2026.04.dispatch_baseline.1",
  day,
  view_mode: viewMode,
  historical: false,
  sync: {
    status: "synced",
    last_synced_at: "2026-04-02T12:00:00Z",
  },
  date_range_meta: {
    anchor_day: day,
    start_date: startDate,
    end_date: endDate,
    total_days: viewMode === "month" ? 30 : 1,
    historical: false,
  },
  target_window: {
    start_date: startDate,
    end_date: endDate,
  },
  status_counts: {
    scheduled: 1,
    in_progress: 0,
    completed: 0,
    canceled: 0,
    other: 0,
  },
  days: [
    {
      date: startDate,
      route_count: 1,
      stop_count: 1,
      scheduled_minutes: 60,
      drive_minutes: 20,
      completion_rate: 0,
      route_density: 1,
      status_counts: {
        scheduled: 1,
        in_progress: 0,
        completed: 0,
        canceled: 0,
        other: 0,
      },
    },
  ],
  baseline_items: [
    {
      id: stopId,
      external_id: stopId,
      fieldroutes_appointment_id: stopId,
      crm_appointment_id: `crm-${stopId}`,
      customer_id: "c-1",
      customer_name: "Taylor Homeowner",
      scheduled_start: `${startDate}T09:00:00Z`,
      scheduled_end: `${startDate}T10:00:00Z`,
      technician_id: technicianId,
      technician_name: technicianName,
      route_id: routeId,
      route_title: `${technicianName} Route`,
      duration_minutes: 60,
      service_type: "General Pest",
      status: "scheduled",
      notes: "",
      latitude: 26.6,
      longitude: -81.9,
      city: "Cape Coral",
      zip_code: "33914",
      source: "fieldroutes",
      classification: "FLEXIBLE",
      planning_classification: "scheduled",
      due_date: startDate,
      due_date_flex_days: 0,
      due_date_deviation_days: 0,
      route_group: "",
      continuity_recent_technicians: [],
      required_skills: [],
    },
  ],
  routes: [
    {
      id: `${startDate}:${technicianId}:${routeId}`,
      route_key: `${startDate}:${technicianId}:${routeId}`,
      service_day: startDate,
      technician_id: technicianId,
      fieldroutes_technician_id: technicianId,
      technician_name: technicianName,
      technician_role: "tech",
      route_id: routeId,
      route_title: `${technicianName} Route`,
      route_color: "#1d4ed8",
      drive_minutes: 20,
      distance_miles: 10,
      route_revenue: 200,
      route_start: `${startDate}T09:00:00Z`,
      route_end: `${startDate}T10:00:00Z`,
      status_counts: {
        scheduled: 1,
        in_progress: 0,
        completed: 0,
        canceled: 0,
        other: 0,
      },
      completion_rate: 0,
      route_density: 1,
      path_points: [],
      opportunities: [],
      stops: [
        {
          id: stopId,
          external_id: stopId,
          fieldroutes_appointment_id: stopId,
          crm_appointment_id: `crm-${stopId}`,
          customer_id: "c-1",
          customer_name: "Taylor Homeowner",
          scheduled_start: `${startDate}T09:00:00Z`,
          scheduled_end: `${startDate}T10:00:00Z`,
          technician_id: technicianId,
          technician_name: technicianName,
          route_id: routeId,
          route_title: `${technicianName} Route`,
          duration_minutes: 60,
          service_type: "General Pest",
          status: "scheduled",
          notes: "",
          latitude: 26.6,
          longitude: -81.9,
          city: "Cape Coral",
          zip_code: "33914",
          source: "fieldroutes",
          classification: "FLEXIBLE",
          planning_classification: "scheduled",
          due_date: startDate,
          due_date_flex_days: 0,
          due_date_deviation_days: 0,
          route_group: "",
          continuity_recent_technicians: [],
          required_skills: [],
          preferred_days: [],
          preferred_time_window: {},
          access_instructions: [],
          metadata: {},
        },
      ],
    },
  ],
});

const renderBoard = (path = "/schedule/day") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/schedule/day" element={<RouteBoard />} />
        <Route path="/schedule/range" element={<RouteBoard />} />
        <Route path="/schedule/month" element={<RouteBoard />} />
      </Routes>
    </MemoryRouter>
  );

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
  optimizeWithConstraints.mockResolvedValue({ data: {} });
  applyOptimizationPlan.mockResolvedValue({ data: {} });
  finalizeSchedule.mockResolvedValue({ data: {} });
});

test("RouteBoard shows a controlled error panel for invalid payloads", async () => {
  getDispatchBoard.mockResolvedValue({ data: { sync: { status: "synced" } } });

  renderBoard("/schedule/day");

  expect(
    await screen.findByText("Unable to load the dispatch board")
  ).toBeInTheDocument();
  expect(
    screen.getByText("Dispatch board response is missing routes.")
  ).toBeInTheDocument();
  expect(screen.queryByText("Routes")).not.toBeInTheDocument();
});

test("RouteBoard ignores stale responses during rapid view switching", async () => {
  const first = deferred();
  const second = deferred();

  getDispatchBoard
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise);

  renderBoard("/schedule/day");

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "month" } });

  await waitFor(() => expect(getDispatchBoard).toHaveBeenCalledTimes(2));

  await act(async () => {
    second.resolve({
      data: buildBoard({
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        viewMode: "month",
        day: "2026-04-02",
        routeId: "r-month",
        technicianId: "81",
        technicianName: "Tech Month",
        stopId: "stop-month",
      }),
    });
  });

  expect(await screen.findByText("April 2026 Dispatch")).toBeInTheDocument();

  await act(async () => {
    first.resolve({
      data: buildBoard({
        startDate: "2026-04-02",
        endDate: "2026-04-02",
        viewMode: "day",
        day: "2026-04-02",
        routeId: "r-day",
        technicianId: "82",
        technicianName: "Tech Day",
        stopId: "stop-day",
      }),
    });
  });

  await waitFor(() =>
    expect(screen.getByText("April 2026 Dispatch")).toBeInTheDocument()
  );
  expect(screen.queryByText("Dispatch for Thu, Apr 2")).not.toBeInTheDocument();
  expect(screen.getAllByText("2026-04-01 → 2026-04-30").length).toBeGreaterThan(0);
});

test("RouteBoard adds a local unassigned route instantly", async () => {
  getDispatchBoard.mockResolvedValue({
    data: buildBoard({
      startDate: "2026-04-02",
      endDate: "2026-04-02",
      viewMode: "day",
      day: "2026-04-02",
      routeId: "r-day",
      technicianId: "82",
      technicianName: "Tech Day",
      stopId: "stop-day",
    }),
  });

  renderBoard("/schedule/day");

  expect((await screen.findAllByText("Tech Day")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: /Add Routes/i }));

  expect(await screen.findAllByText("Unassigned")).not.toHaveLength(0);
});
