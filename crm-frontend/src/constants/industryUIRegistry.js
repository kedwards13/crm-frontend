import { normalizeIndustry } from "../helpers/tenantHelpers";

const base = {
  primaryObject: "records",
  customerCard: ["identity"],
  pipelines: [],
};

export const industryUIRegistry = {
  general: {
    ...base,
  },
  food_wellness: {
    ...base,
    primaryObject: "orders",
    customerCard: [
      "active_orders",
      "upcoming_orders",
      "outstanding_balance",
      "allergies",
      "dietary_constraints",
      "order_history",
    ],
    pipelines: ["order_pipeline"],
  },
  pest_control: {
    ...base,
    primaryObject: "jobs",
    customerCard: ["service_history", "open_tickets"],
    pipelines: ["job_pipeline"],
  },
  fitness: {
    ...base,
    primaryObject: "memberships",
    customerCard: ["active_memberships", "upcoming_sessions"],
    pipelines: ["membership_pipeline"],
  },
};

const ORDER_SIGNAL_KEYS = [
  "orders",
  "order_history",
  "orderHistory",
  "subscription_orders",
  "subscriptions",
  "deliveries",
  "upcoming_deliveries",
  "upcomingDeliveries",
];

const PLAN_SIGNAL_KEYS = [
  "plan",
  "plan_name",
  "subscription",
  "subscription_status",
  "meal_plan",
  "meal_plan_id",
];

const CONSTRAINT_SIGNAL_KEYS = [
  "allergies",
  "dietary_constraints",
  "dietary",
  "dietary_notes",
  "preferences",
];

const hasSignalKey = (raw, keys) =>
  !!raw &&
  keys.some((k) => {
    const val = raw[k];
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "string") return val.trim().length > 0;
    return val !== undefined && val !== null;
  });

export const hasOrderSignals = (raw) =>
  hasSignalKey(raw, ORDER_SIGNAL_KEYS) || hasSignalKey(raw, PLAN_SIGNAL_KEYS);

export const hasConstraintSignals = (raw) => hasSignalKey(raw, CONSTRAINT_SIGNAL_KEYS);

export const resolveIndustryMode = (tenantIndustry, raw) => {
  const normalized = normalizeIndustry(tenantIndustry || "general");
  if (industryUIRegistry[normalized]) return normalized;
  if (hasOrderSignals(raw) || hasConstraintSignals(raw)) return "food_wellness";
  return "general";
};

export const getIndustryUIConfig = (tenantIndustry, raw) =>
  industryUIRegistry[resolveIndustryMode(tenantIndustry, raw)] ||
  industryUIRegistry.general;
