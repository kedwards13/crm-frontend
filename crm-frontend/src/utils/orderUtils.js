const ORDER_KEYS = [
  "orders",
  "subscription_orders",
  "order_history",
  "orderHistory",
  "deliveries",
  "upcoming_deliveries",
  "upcomingDeliveries",
  "fulfillments",
];

const HISTORY_KEYS = [
  "order_history",
  "orderHistory",
  "historical_orders",
  "historicalOrders",
];

const STATUS_MAP = [
  { match: ["draft", "pending", "created"], value: "Draft" },
  { match: ["scheduled", "queued", "confirmed"], value: "Scheduled" },
  { match: ["preparing", "in_progress", "processing"], value: "Preparing" },
  { match: ["ready", "packed", "staged"], value: "Ready" },
  { match: ["fulfilled", "delivered", "completed", "complete"], value: "Fulfilled" },
];

const getFirstArray = (obj, keys) => {
  if (!obj) return [];
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) return val;
  }
  return [];
};

export const extractOrderCollections = (raw = {}) => {
  const topOrders = getFirstArray(raw, ORDER_KEYS);
  const nestedOrders = getFirstArray(raw.attributes, ORDER_KEYS);
  const nestedMeta = getFirstArray(raw.meta, ORDER_KEYS);
  const history = getFirstArray(raw, HISTORY_KEYS) || getFirstArray(raw.attributes, HISTORY_KEYS);
  const orders = topOrders.length ? topOrders : nestedOrders.length ? nestedOrders : nestedMeta;
  return { orders: Array.isArray(orders) ? orders : [], history: Array.isArray(history) ? history : [] };
};

export const getOrderStatusLabel = (order = {}) => {
  const raw =
    order.status ||
    order.state ||
    order.order_status ||
    order.fulfillment_status ||
    order.delivery_status ||
    order.stage;
  if (!raw) return "";
  const normalized = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  const match = STATUS_MAP.find((entry) => entry.match.includes(normalized));
  return match ? match.value : "";
};

export const getOrderIdLabel = (order = {}) =>
  order.order_number ||
  order.order_id ||
  order.number ||
  order.id ||
  order.reference ||
  "";

export const getOrderDateValue = (order = {}) =>
  order.delivery_date ||
  order.scheduled_for ||
  order.scheduled_at ||
  order.delivery_window_start ||
  order.fulfilled_at ||
  order.created_at ||
  "";

export const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const getOrderAmountValue = (order = {}) => {
  const amount =
    order.balance_due ??
    order.amount_due ??
    order.total_due ??
    order.total ??
    order.amount ??
    order.price;
  const num = Number(amount);
  return Number.isFinite(num) ? num : null;
};

export const formatCurrency = (value) => {
  if (value == null || !Number.isFinite(value)) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value}`;
  }
};

export const isOrderPaid = (order = {}) => {
  if (order.is_paid != null) return Boolean(order.is_paid);
  const status = String(order.payment_status || "").toLowerCase();
  if (status) return status === "paid" || status === "settled";
  const balance = getOrderAmountValue(order);
  if (balance != null && Number.isFinite(balance)) return balance <= 0;
  return true;
};

export const splitOrderBuckets = (orders = []) => {
  const buckets = {
    Draft: [],
    Scheduled: [],
    Preparing: [],
    Ready: [],
    Fulfilled: [],
  };
  orders.forEach((order) => {
    const label = getOrderStatusLabel(order);
    if (label && buckets[label]) buckets[label].push(order);
  });
  return buckets;
};

export const summarizeOrders = (orders = []) => {
  const buckets = splitOrderBuckets(orders);
  const active = [
    ...buckets.Scheduled,
    ...buckets.Preparing,
    ...buckets.Ready,
  ];
  const upcoming = [...buckets.Draft, ...buckets.Scheduled];
  const fulfilled = buckets.Fulfilled;
  const unpaid = orders.filter((order) => !isOrderPaid(order));
  return {
    buckets,
    activeCount: active.length,
    upcomingCount: upcoming.length,
    fulfilledCount: fulfilled.length,
    unpaidCount: unpaid.length,
    unpaidTotal: unpaid
      .map(getOrderAmountValue)
      .filter((v) => Number.isFinite(v))
      .reduce((sum, v) => sum + v, 0),
  };
};

export const extractConstraints = (raw = {}) => {
  const allergies = raw.allergies || raw.allergy_notes || raw.allergy;
  const dietary =
    raw.dietary_constraints ||
    raw.dietary ||
    raw.dietary_notes ||
    raw.preferences;
  const normalizeList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v) => String(v)).filter(Boolean);
    if (typeof val === "string") {
      return val.split(",").map((v) => v.trim()).filter(Boolean);
    }
    return [];
  };
  return {
    allergies: normalizeList(allergies),
    dietary: normalizeList(dietary),
  };
};
