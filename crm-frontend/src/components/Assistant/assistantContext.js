const ENTITY_ID_PATTERN = /^[0-9]+$|^[0-9a-f]{8}-[0-9a-f-]{8,}$/i;

const PAGE_TITLES = {
  dashboard: "Dashboard",
  leads: "Leads",
  customers: "Customers",
  schedule: "Schedule",
  communications: "Communications",
  finance: "Finance",
  analytics: "Analytics",
  marketing: "Marketing",
  operations: "Operations",
  settings: "Settings",
  revival: "Revival",
  quotes: "Quotes",
};

const normalizePage = (raw = "") => {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "dashboard";
  if (value === "communication") return "communications";
  return value;
};

export function getAssistantPageContext(location) {
  const pathname = location?.pathname || "/";
  const search = location?.search || "";
  const params = new URLSearchParams(search);
  const segments = pathname.split("/").filter(Boolean);
  const page = normalizePage(segments[0] || "dashboard");
  const view = segments[1] || "";
  const lastSegment = segments[segments.length - 1] || "";
  const maybeEntityId = ENTITY_ID_PATTERN.test(lastSegment) ? lastSegment : "";

  const pageContext = {
    page,
    path: `${pathname}${search || ""}`,
    title: PAGE_TITLES[page] || "Workspace",
    view,
    search_query: params.get("search") || "",
    entity_type: "",
    entity_id: "",
    lead_id: params.get("lead_id") || "",
    customer_id: params.get("customer_id") || "",
    appointment_id: params.get("appointment_id") || "",
    quote_id: params.get("quote_id") || "",
  };

  if (page === "leads" && maybeEntityId && !["new", "pipeline", "under-contract", "intake"].includes(lastSegment)) {
    pageContext.entity_type = "lead";
    pageContext.entity_id = maybeEntityId;
    pageContext.lead_id = maybeEntityId;
  }

  if (page === "customers" && maybeEntityId && !["list", "care", "ai", "new"].includes(lastSegment)) {
    pageContext.entity_type = "customer";
    pageContext.entity_id = maybeEntityId;
    pageContext.customer_id = maybeEntityId;
  }

  if (page === "quotes" && maybeEntityId) {
    pageContext.entity_type = "quote";
    pageContext.entity_id = maybeEntityId;
    pageContext.quote_id = maybeEntityId;
  }

  if (page === "schedule" && view === "appointments" && maybeEntityId) {
    pageContext.entity_type = "appointment";
    pageContext.entity_id = maybeEntityId;
    pageContext.appointment_id = maybeEntityId;
  }

  if (!pageContext.entity_id && pageContext.lead_id) {
    pageContext.entity_type = "lead";
    pageContext.entity_id = pageContext.lead_id;
  } else if (!pageContext.entity_id && pageContext.customer_id) {
    pageContext.entity_type = "customer";
    pageContext.entity_id = pageContext.customer_id;
  } else if (!pageContext.entity_id && pageContext.appointment_id) {
    pageContext.entity_type = "appointment";
    pageContext.entity_id = pageContext.appointment_id;
  }

  return pageContext;
}

export function formatAssistantMode(mode = "") {
  const normalized = String(mode || "").trim().toLowerCase();
  if (!normalized) return "Chat";
  return normalized
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}
