// ---------------------------------------------------------
// CustomersList - CRM Table
// ---------------------------------------------------------
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  memo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getCustomers,
  enrichBulk,
  getCustomerMetrics,
  assignToCampaign,
} from "../../api/customersApi";
import {
  listOperationalCustomers,
  getOperationalCustomerMetrics,
} from "../../api/operationsCustomersApi";

import { toast } from "react-toastify";
import { Brain, Eye, Zap } from "lucide-react";
import { mapEntity } from "../../utils/contactMapper";
import { getIndustry } from "../../helpers/tenantHelpers";
import { getIndustryCopy } from "../../constants/industryCopy";
import api, { normalizeArray } from "../../apiClient";
import ActionButton from "../ui/ActionButton";
import SearchInput from "../ui/SearchInput";
import StatCard from "../ui/StatCard";
import WidgetGrid from "../ui/WidgetGrid";
import WidgetPanel from "../ui/WidgetPanel";

import "./CustomerList.css";

const CustomerPopup = lazy(() => import("../Profile/CustomerPopup"));
const ROW_HEIGHT = 58;
const OVERSCAN = 8;
const PAGE_SIZE = 50;

// ---------------------------------------------------------
// ROW - optimized for speed
// ---------------------------------------------------------
const clean = (value) => String(value || "").trim();

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
};

const CustomerRow = memo(({ c, checkedSet, toggleCheck, openProfile }) => {
  const isOperational = Boolean(c?.source) || Boolean(c?.fieldroutes_customer_id) || Boolean(c?.crm_customer_id);
  // Bulk actions target CRM numeric PKs (Customer.id). Ops rows do not reliably include it.
  const crmSelectId = !isOperational ? clean(c?.id) : "";
  const selectable = Boolean(crmSelectId);
  const displayName =
    clean(c?.customer_name) ||
    clean(`${clean(c?.first_name)} ${clean(c?.last_name)}`) ||
    "Customer";

  const summary =
    clean(c?.ai_summary) ||
    (c?.plan_count !== undefined || c?.last_service_at || c?.next_service_at
      ? [
          c?.plan_count !== undefined ? `Plans: ${Number(c.plan_count) || 0}` : null,
          c?.last_service_at ? `Last: ${formatDate(c.last_service_at)}` : null,
          c?.next_service_at ? `Next: ${formatDate(c.next_service_at)}` : null,
        ]
          .filter(Boolean)
          .join(" • ")
      : "");

  return (
    <tr
      className="gt-row"
      onClick={() => {
        return openProfile?.(c);
      }}
    >
      <td className="gt-cell center w10">
        <input
          type="checkbox"
          className="gt-checkbox"
          disabled={!selectable}
          checked={selectable ? checkedSet.has(crmSelectId) : false}
          onClick={(e) => e.stopPropagation()}
          onChange={() => (selectable ? toggleCheck(crmSelectId) : undefined)}
        />
      </td>

      <td className="gt-cell name-col">
        {displayName}
      </td>

      <td className="gt-cell">{c.primary_email || "N/A"}</td>
      <td className="gt-cell">{c.primary_phone || "N/A"}</td>
      <td className="gt-cell">{c.city || "N/A"}</td>
      <td className="gt-cell">{c.state || "N/A"}</td>

      <td className="gt-cell summary-col">
        {summary ? summary.slice(0, 120) : "N/A"}
      </td>

      <td className="gt-cell center">
        {isOperational ? (
          String(c?.source || "") === "crm" ? (
            "CRM"
          ) : c?.crm_customer_id ? (
            <span className="gt-badge-ok">Linked</span>
          ) : (
            "FieldRoutes"
          )
        ) : c?.is_enriched ? (
          <span className="gt-badge-ok">Yes</span>
        ) : (
          "N/A"
        )}
      </td>

      <td className="gt-cell actions-col">
        <div className="gt-actions">
          <button
            title="View Profile"
            onClick={(e) => {
              e.stopPropagation();
              openProfile?.(c);
            }}
            className="gt-icon-btn blue"
          >
            <Eye size={15} />
          </button>

          <button
            title="AI Enrich"
            onClick={(e) => {
              e.stopPropagation();
              if (isOperational || !crmSelectId) return;
              enrichBulk([crmSelectId]);
              toast.info(`Enriching ${displayName}...`);
            }}
            className="gt-icon-btn green"
            disabled={isOperational || !crmSelectId}
          >
            <Brain size={15} />
          </button>

          <button
            title="AI Summary"
            onClick={(e) => {
              e.stopPropagation();
              toast.info(c.ai_summary || "No summary yet.");
            }}
            className="gt-icon-btn amber"
            disabled={isOperational}
          >
            <Zap size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
});

// ---------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------
export default function CustomerList() {
  const location = useLocation();
  const navigate = useNavigate();
  const industry = getIndustry("general");
  const copy = getIndustryCopy(industry);
  const customersLower = copy.customers.toLowerCase();
  const [opsMode, setOpsMode] = useState(false);
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false);
  const [search, setSearch] = useState(localStorage.getItem("customerSearch") || "");
  const [cityFilter, setCityFilter] = useState("");
  const [servicePlanFilter, setServicePlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [assignedRepFilter, setAssignedRepFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

  const [checked, setChecked] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);

  const debounceRef = useRef(null);
  const tableScrollRef = useRef(null);
  const metricsRef = useRef(null);
  const fetchSeqRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const safeCustomers = normalizeArray(customers);
  const checkedSet = useMemo(() => new Set(checked), [checked]);
  const selectableIds = useMemo(
    () => safeCustomers.filter((c) => !c?.source && c?.id).map((c) => String(c.id)),
    [safeCustomers]
  );

  useEffect(() => {
    const container = tableScrollRef.current;
    if (!container || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setViewportHeight(container.clientHeight || 560);
    });
    observer.observe(container);
    setViewportHeight(container.clientHeight || 560);
    return () => observer.disconnect();
  }, [safeCustomers.length]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    safeCustomers.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
  );
  const visibleCustomers = safeCustomers.slice(startIndex, endIndex);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (safeCustomers.length - endIndex) * ROW_HEIGHT);

  const ordering = useMemo(() => {
    const map = opsMode
      ? {
          name: "customer_name",
          last_service: "last_service_at",
          created_at: "updated_at",
          revenue: "plan_count",
        }
      : {
          name: "last_name",
          last_service: "last_service",
          created_at: "created_at",
          revenue: "revenue",
        };
    const field = map[sortBy] || sortBy;
    if (!field) return "";
    return sortDir === "desc" ? `-${field}` : field;
  }, [opsMode, sortBy, sortDir]);

  const listParams = useMemo(() => {
    const params = {};
    if (search) params.search = search;
    if (cityFilter) params.city = cityFilter;
    if (statusFilter) params.status = statusFilter;
    if (servicePlanFilter) params.service_plan = servicePlanFilter;
    if (assignedRepFilter) params.assigned_rep = assignedRepFilter;
    if (ordering) params.ordering = ordering;
    return params;
  }, [search, cityFilter, statusFilter, servicePlanFilter, assignedRepFilter, ordering]);

  const loadIntegrationsMode = useCallback(async () => {
    setIntegrationsLoaded(false);
    try {
      const { data } = await api.get("/integrations/");
      const rows = Array.isArray(data) ? data : data?.results || [];
      const fieldroutes = rows.find((r) => String(r?.provider || "").toLowerCase() === "fieldroutes");
      const enabled = Boolean(fieldroutes?.enabled);
      setOpsMode(enabled);
    } catch {
      setOpsMode(false);
    } finally {
      setIntegrationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      await loadIntegrationsMode();
    };
    void run();
    const onTenantChanged = () => {
      if (!mounted) return;
      void loadIntegrationsMode();
    };
    window.addEventListener("activeTenant:changed", onTenantChanged);
    return () => {
      mounted = false;
      window.removeEventListener("activeTenant:changed", onTenantChanged);
    };
  }, [loadIntegrationsMode]);

  // ---------------------- Load customers (paginated) ----------------------
  const fetchCustomersPage = useCallback(
    async ({ targetPage, append }) => {
      const seq = ++fetchSeqRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      try {
        const listFn = opsMode ? listOperationalCustomers : getCustomers;
        const { data } = await listFn({
          page: targetPage,
          page_size: PAGE_SIZE,
          ...listParams,
        });

        // Ignore stale responses (fast search/filter changes).
        if (seq !== fetchSeqRef.current) return;

        const rows = normalizeArray(data);
        const count = Number.isFinite(Number(data?.count)) ? Number(data.count) : rows.length;

        setTotalCount(count);
        setHasNext(Boolean(data?.next));
        setPage(targetPage);
        setCustomers((prev) => (append ? prev.concat(rows) : rows));
        if (!append) setChecked([]);
      } catch (err) {
        console.error(err);
        setError("Failed to load customers.");
        setHasNext(false);
        setCustomers((prev) => (append ? prev : []));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [listParams, opsMode]
  );

  const fetchFirstPage = useCallback(
    async ({ resetScroll } = {}) => {
      if (resetScroll && tableScrollRef.current) {
        tableScrollRef.current.scrollTop = 0;
        setScrollTop(0);
      }
      await fetchCustomersPage({ targetPage: 1, append: false });
    },
    [fetchCustomersPage]
  );

  const fetchNextPage = useCallback(async () => {
    if (loading || loadingMore || loadingMoreRef.current || !hasNext) return;
    loadingMoreRef.current = true;
    try {
      await fetchCustomersPage({ targetPage: page + 1, append: true });
    } finally {
      loadingMoreRef.current = false;
    }
  }, [fetchCustomersPage, hasNext, loading, loadingMore, page]);

  const fetchMetrics = useCallback(async () => {
    try {
      const fn = opsMode ? getOperationalCustomerMetrics : getCustomerMetrics;
      const { data } = await fn();
      setMetrics(data);
      metricsRef.current = data;
    } catch {}
  }, [opsMode]);

  useEffect(() => {
    localStorage.setItem("customerSearch", search);
  }, [search]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFirstPage({ resetScroll: true });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [fetchFirstPage]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (location.state?.create !== "customer") return;
    setSelected(
      mapEntity({
        object: "customer",
        first_name: "",
        last_name: "",
        primary_email: "",
        primary_phone: "",
        industry,
      })
    );
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, industry]);

  // Auto-refresh metrics and the top of the table when new data arrives.
  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      try {
        const fn = opsMode ? getOperationalCustomerMetrics : getCustomerMetrics;
        const { data } = await fn();
        if (!mounted) return;

        const prevTotal = Number(metricsRef.current?.total_customers || 0);
        const nextTotal = Number(data?.total_customers || 0);
        setMetrics(data);
        metricsRef.current = data;

        const container = tableScrollRef.current;
        const nearTop = !container || (container.scrollTop || 0) < 120;
        if (nextTotal !== prevTotal && nearTop) {
          fetchFirstPage({ resetScroll: false });
        }
      } catch {
        // Ignore auto-refresh errors.
      }
    };

    const interval = window.setInterval(tick, 30000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchFirstPage, opsMode]);

  // ---------------------- Bulk actions ----------------------
  const toggleCheck = (id) =>
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setChecked(
      checked.length === selectableIds.length
        ? []
        : selectableIds
    );

  const bulkEnrich = async () => {
    if (!checked.length) return toast.info(`Select ${customersLower}.`);
    if (opsMode) return toast.info("Bulk enrichment is available for CRM customers only.");

    setEnriching(true);

    try {
      await enrichBulk(checked);
      toast.success("Enrichment started.");
      fetchFirstPage({ resetScroll: false });
      fetchMetrics();
    } catch {
      toast.error("Enrichment failed.");
    } finally {
      setEnriching(false);
    }
  };

  const bulkAssign = async () => {
    if (!checked.length) return toast.info(`Select ${customersLower}.`);
    if (!campaignId) return toast.info("Choose a campaign.");
    if (opsMode) return toast.info("Campaign assignment is available for CRM customers only.");

    try {
      await assignToCampaign(campaignId, checked);
      toast.success("Campaign assigned.");
      setChecked([]);
    } catch {
      toast.error("Assignment failed.");
    }
  };

  // ---------------------- Render ----------------------
  const openProfile = useCallback(
    (c) => {
      // Normalize the row so CustomerPopup resolves correctly.
      // Operational rows use fieldroutes_customer_id as `id` but the popup
      // needs `customer_id` (CRM UUID) for PATCH calls and `object` for
      // the entity mapper to pick the right path.
      const crmId = clean(c?.crm_customer_id);
      const frId = clean(c?.fieldroutes_customer_id);
      setSelected({
        ...c,
        object: "customer",
        // Prefer CRM customer_id for popup resolution; fall back to raw id.
        customer_id: crmId || c?.customer_id || c?.id,
        id: crmId || c?.id,
        // Keep FR reference for operational tabs.
        fieldroutes_customer_id: frId,
        // Map field names the popup/mapper expect.
        full_name: c?.customer_name || c?.full_name || c?.name,
        primary_phone: c?.primary_phone || c?.phone,
        primary_email: c?.primary_email || c?.email,
      });
    },
    []
  );

  const clearFilters = () => {
    setCityFilter("");
    setServicePlanFilter("");
    setStatusFilter("active");
    setAssignedRepFilter("");
    setSortBy("created_at");
    setSortDir("desc");
  };

  const handleScroll = (event) => {
    const container = event.currentTarget;
    setScrollTop(container.scrollTop);

    // Infinite scroll trigger: within 400px of bottom.
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom < 400) fetchNextPage();
  };
  return (
    <div className="gt-customerlist">

      {/* Toolbar */}
      <div className="gt-toolbar">
        <SearchInput
          className="gt-search"
          value={search}
          placeholder={`Search ${customersLower}...`}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="gt-toolbar-actions">
          <ActionButton
            onClick={() =>
              setSelected(
                mapEntity({
                  object: "customer",
                  first_name: "",
                  last_name: "",
                  primary_email: "",
                  primary_phone: "",
                  industry,
                })
              )
            }
            size="sm"
            variant="primary"
            title="Create a new customer"
          >
            + Add Customer
          </ActionButton>
          <div className="gt-pill" title="Data source">
            {integrationsLoaded ? (opsMode ? "Ops: FieldRoutes" : "CRM") : "Loading…"}
          </div>
          <select
            className="gt-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort"
          >
            <option value="name">Sort: Name</option>
            <option value="last_service">Sort: Last Service</option>
            <option value="created_at">Sort: Created Date</option>
            <option value="revenue">Sort: Revenue</option>
          </select>

          <select
            className="gt-select"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
            title="Sort direction"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          <ActionButton onClick={clearFilters} size="sm" variant="secondary">
            Clear
          </ActionButton>

          <select
            className="gt-select"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">Assign to campaign...</option>
            <option value="1">Welcome Series</option>
            <option value="2">Follow-Up</option>
            <option value="3">Reactivation</option>
          </select>

          <ActionButton
            disabled={!checked.length}
            onClick={bulkAssign}
            size="sm"
            variant="secondary"
          >
            Assign
          </ActionButton>

          <ActionButton
            disabled={!checked.length || enriching}
            onClick={bulkEnrich}
            size="sm"
            variant="primary"
          >
            {enriching ? "Enriching..." : "AI Enrich"}
          </ActionButton>
        </div>
      </div>

      {/* Filters */}
      <div className="gt-toolbar gt-filters">
        <input
          className="gt-select gt-filter-input"
          value={cityFilter}
          placeholder="City..."
          onChange={(e) => setCityFilter(e.target.value)}
        />

        <select
          className="gt-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          title="Status"
        >
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
          <option value="all">Status: All</option>
        </select>

        <select
          className="gt-select"
          value={servicePlanFilter}
          onChange={(e) => setServicePlanFilter(e.target.value)}
          title="Service Plan"
        >
          <option value="">Service Plan: Any</option>
          <option value="any">Has Plan</option>
          <option value="none">No Plan</option>
        </select>

        <input
          className="gt-select gt-filter-input"
          value={assignedRepFilter}
          placeholder="Assigned Rep..."
          onChange={(e) => setAssignedRepFilter(e.target.value)}
        />
      </div>

      {/* Metrics */}
      {metrics && (
        <WidgetGrid columns={6} className="gt-metrics">
          {(opsMode
            ? [
                [copy.customers, metrics.total_customers],
                ["Active", metrics.active_customers],
                ["Inactive", metrics.inactive_customers],
                ["Linked CRM", metrics.linked_crm_customers],
                ["CRM-only", metrics.crm_only_customers],
                ["Linked Rows", metrics.linked_fieldroutes_rows],
              ]
            : [
                [copy.customers, metrics.total_customers],
                ["Active", metrics.active_customers],
                [
                  "Inactive",
                  Math.max(
                    0,
                    (metrics.total_customers || 0) - (metrics.active_customers || 0)
                  ),
                ],
                ["Enriched", metrics.enriched_customers],
                ["No-Show Rate", `${metrics.no_show_rate}%`],
                ["Avg Visits", metrics.average_visits_per_customer],
              ]
          ).map(([label, value]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </WidgetGrid>
      )}

      {/* Table */}
      {error && <div className="gt-error">{error}</div>}

      {loading ? (
        <div className="gt-loading">Loading {customersLower}...</div>
      ) : !safeCustomers.length ? (
        <div className="gt-empty">No {customersLower} found.</div>
      ) : (
        <WidgetPanel className="gt-table-shell" padded={false}>
          <div className="gt-table-scroll" ref={tableScrollRef} onScroll={handleScroll}>
            <div className="gt-table-wrapper">
              <table className="gt-table">
                <thead>
                  <tr>
                    <th className="center w10">
                      <input
                        type="checkbox"
                        className="gt-checkbox"
                        checked={selectableIds.length > 0 && checked.length === selectableIds.length}
                        disabled={!selectableIds.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    {["Name", "Email", "Phone", "City", "State", "AI Summary", "AI", "Actions"].map(
                      (h) => (
                        <th key={h}>{h}</th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {topSpacer > 0 ? (
                    <tr className="gt-spacer">
                      <td colSpan={9} style={{ height: `${topSpacer}px` }} />
                    </tr>
                  ) : null}
                  {visibleCustomers.map((c) => (
                    <CustomerRow
                      key={
                        clean(c?.customer_id) ||
                        clean(c?.fieldroutes_customer_id) ||
                        clean(c?.crm_customer_id) ||
                        clean(c?.id)
                      }
                      c={c}
                      checkedSet={checkedSet}
                      toggleCheck={toggleCheck}
                      openProfile={openProfile}
                    />
                  ))}
                  {bottomSpacer > 0 ? (
                    <tr className="gt-spacer">
                      <td colSpan={9} style={{ height: `${bottomSpacer}px` }} />
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="gt-table-footer">
            <div className="gt-table-count">
              Showing <strong>{safeCustomers.length}</strong> of <strong>{totalCount || safeCustomers.length}</strong>
            </div>
            <div className="gt-table-footer-actions">
              <ActionButton
                onClick={() => fetchFirstPage({ resetScroll: false })}
                size="sm"
                variant="secondary"
                disabled={loading || loadingMore}
              >
                Refresh
              </ActionButton>
              <ActionButton
                onClick={fetchNextPage}
                size="sm"
                variant="primary"
                disabled={!hasNext || loading || loadingMore}
              >
                {loadingMore ? "Loading..." : hasNext ? "Load More" : "End"}
              </ActionButton>
            </div>
          </div>
        </WidgetPanel>
      )}

      {/* Create-only popup fallback */}
      {selected && (
        <Suspense fallback={<div className="gt-loading p-6">Loading...</div>}>
          <CustomerPopup
            lead={selected}
            leadType="customer"
            onClose={() => {
              setSelected(null);
              fetchFirstPage({ resetScroll: false });
              fetchMetrics();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
