import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TianLeads from "./TianLeads";
import Assistant from "../Assistant/Assistant";
import FiltersBar from "../Layout/FiltersBar";
import { AuthContext } from "../../App";
import CustomerPopup from "../Profile/CustomerPopup";
import { getIndustry } from "../../helpers/tenantHelpers";
import {
  listCrmLeads,
  listWebLeads,
  archiveWebLead,
  spamWebLead,
  transferLead,
} from "../../api/leadsApi";
import { normalizeLead } from "../../utils/normalizeLead";
import { getPipelineConfig } from "../../constants/pipelineRegistry";
import "./LeadsPage.css";

function useDebouncedValue(value, delayMs = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return v;
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token } = useContext(AuthContext);
  const industry = getIndustry("general");
  const pipelineConfig = getPipelineConfig(industry);

  const [inboxLeads, setInboxLeads] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [errorInbox, setErrorInbox] = useState("");
  const [crmLeads, setCrmLeads] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [errorCrm, setErrorCrm] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeLead, setActiveLead] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 250);
  const didRef = useRef(false);
  const searchRef = useRef(null);

  const subPath = useMemo(() => {
    const trimmed = location.pathname.replace(/^\/leads\/?/, "");
    return trimmed.split("/")[0];
  }, [location.pathname]);

  const isWebView = !subPath || subPath === "intake" || subPath === "new";
  const stageKeys = new Set((pipelineConfig?.stages || []).map((s) => s.key));
  const stageLabelBySlug = new Map(
    (pipelineConfig?.stages || []).map((s) => [
      String(s.label || s.key)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      s.key,
    ])
  );
  const crmStatus = isWebView
    ? null
    : stageKeys.has(subPath)
    ? subPath
    : stageLabelBySlug.get(subPath) || null;

  // Scroll reset
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        toggleAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const loadInboxLeads = useCallback(async () => {
    setLoadingInbox(true);
    setErrorInbox("");
    try {
      const resWeb = await listWebLeads();
      const rows = Array.isArray(resWeb.data)
        ? resWeb.data
        : resWeb.data?.results || [];
      setInboxLeads(rows.map(normalizeLead));
    } catch (e) {
      setErrorInbox(e.message || "Web leads fetch failed");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const loadCrmLeads = useCallback(async () => {
    setLoadingCrm(true);
    setErrorCrm("");
    try {
      const resCrm = await listCrmLeads();
      const rows = Array.isArray(resCrm.data)
        ? resCrm.data
        : resCrm.data?.results || [];
      setCrmLeads(rows.map(normalizeLead));
    } catch (e) {
      setErrorCrm(e.message || "CRM fetch failed");
    } finally {
      setLoadingCrm(false);
    }
  }, []);

  // Load leads (web + CRM)
  useEffect(() => {
    if (!isAuthenticated || !token) return navigate("/login");
    if (didRef.current) return;
    didRef.current = true;

    loadInboxLeads();
    loadCrmLeads();
  }, [isAuthenticated, token, navigate, loadInboxLeads, loadCrmLeads]);

  useEffect(() => {
    if (!isWebView || sortBy === "newest") return;
    setSortBy("newest");
  }, [isWebView, sortBy]);

  useEffect(() => {
    if (location.state?.create !== "lead") return;
    const industry = getIndustry("general");
    setActiveLead({
      object: "lead",
      name: "",
      email: "",
      phone_number: "",
      industry,
      status: "new",
      address: "",
      attributes: {},
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  // Filtering + Sorting logic
  const filteredLeads = useMemo(() => {
    let rows = Array.isArray(inboxLeads) ? [...inboxLeads] : [];

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const fields = [
          r.displayName,
          r.displayEmail,
          r.displayPhone,
          r.serviceLabel || r.service,
          r.message,
        ].map((x) => (x || "").toString().toLowerCase());
        return fields.some((f) => f.includes(q));
      });
    }

    if (dateFrom)
      rows = rows.filter(
        (r) => r.created_at && new Date(r.created_at) >= new Date(dateFrom)
      );
    if (dateTo)
      rows = rows.filter(
        (r) => r.created_at && new Date(r.created_at) <= new Date(dateTo)
      );

    rows.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    return rows;
  }, [inboxLeads, debouncedQuery, dateFrom, dateTo]);

  const filteredCrmLeads = useMemo(() => {
    let rows = Array.isArray(crmLeads) ? [...crmLeads] : [];

    if (crmStatus) {
      rows = rows.filter((lead) => {
        const safe = String(lead.safeStatus || "new");
        if (safe === crmStatus) return true;
        if (crmStatus === "new" && !stageKeys.has(safe)) return true;
        return false;
      });
    }

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const fields = [
          r.displayName,
          r.displayEmail,
          r.displayPhone,
          r.serviceLabel || r.service,
          r.message,
          r.summary,
        ].map((x) => (x || "").toString().toLowerCase());
        return fields.some((f) => f.includes(q));
      });
    }

    if (dateFrom)
      rows = rows.filter(
        (r) => r.created_at && new Date(r.created_at) >= new Date(dateFrom)
      );
    if (dateTo)
      rows = rows.filter(
        (r) => r.created_at && new Date(r.created_at) <= new Date(dateTo)
      );

    rows.sort((a, b) => {
      if (sortBy === "name")
        return (a.displayName || "").localeCompare(b.displayName || "");
      if (sortBy === "oldest")
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return rows;
  }, [crmLeads, crmStatus, debouncedQuery, sortBy, dateFrom, dateTo]);

  // Selection logic
  const allVisibleIds = filteredLeads
    .map((lead) => lead.id)
    .filter((id) => id != null);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selected.has(id));

  const toggleAll = useCallback(() => {
    const next = new Set(selected);
    if (allSelected) allVisibleIds.forEach((id) => next.delete(id));
    else allVisibleIds.forEach((id) => next.add(id));
    setSelected(next);
  }, [selected, allSelected, allVisibleIds]);

  const toggleOne = (id) => {
    if (id == null) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Save handlers
  const handleSaveToCrm = async (webLead) => {
    try {
      const webLeadId = webLead.id;
      if (!webLeadId) throw new Error("Missing web lead id");
      await transferLead({ lead_id: webLeadId });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(webLeadId);
        return next;
      });
      await Promise.all([loadInboxLeads(), loadCrmLeads()]);
    } catch (err) {
      alert(`Save to CRM failed: ${String(err).slice(0, 200)}`);
    }
  };

  const handleBulkSave = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      for (const id of ids) {
        await transferLead({ lead_id: id });
      }
      setSelected(new Set());
      await Promise.all([loadInboxLeads(), loadCrmLeads()]);
    } catch (err) {
      alert(`Bulk save failed: ${String(err).slice(0, 200)}`);
    }
  };

  const handleArchive = async (webLead) => {
    try {
      const webLeadId = webLead.id;
      if (!webLeadId) throw new Error("Missing web lead id");
      await archiveWebLead(webLeadId);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(webLeadId);
        return next;
      });
      await loadInboxLeads();
    } catch (err) {
      alert(`Archive failed: ${String(err).slice(0, 200)}`);
    }
  };

  const handleSpam = async (webLead) => {
    try {
      const webLeadId = webLead.id;
      if (!webLeadId) throw new Error("Missing web lead id");
      await spamWebLead(webLeadId);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(webLeadId);
        return next;
      });
      await loadInboxLeads();
    } catch (err) {
      alert(`Spam failed: ${String(err).slice(0, 200)}`);
    }
  };

  // Filter reset
  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  };

  const listTitle = isWebView ? "New Requests" : "Leads";
  const listCount = isWebView ? filteredLeads.length : filteredCrmLeads.length;
  const listLoading = isWebView ? loadingInbox : loadingCrm;
  const listError = isWebView ? errorInbox : errorCrm;
  const statusLabel = crmStatus
    ? pipelineConfig?.stages?.find((s) => s.key === crmStatus)?.label || subPath
    : "all";

  return (
    <div className="leads-page">
      {/* 🔹 Filters */}
      <FiltersBar
        left={
          isWebView ? (
            <button
              className="filters-button"
              onClick={toggleAll}
              title={
                allSelected ? "Unselect all visible" : "Select all visible leads"
              }
              disabled={!allVisibleIds.length}
            >
              {allSelected ? "☑︎" : "☐"}
            </button>
          ) : null
        }
        center={
          <>
            <input
              ref={searchRef}
              className="filters-input"
              placeholder="Search name, email, phone, service, message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              className="filters-input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
            />
            <input
              className="filters-input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
            />
            {(query || dateFrom || dateTo || sortBy !== "newest") && (
              <button className="filters-button" onClick={clearFilters}>
                Clear
              </button>
            )}
          </>
        }
        right={
          <>
            <select
              className="filters-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={isWebView}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>

            <div
              className="filters-view-toggle"
              role="tablist"
              aria-label="View Mode"
            >
              <button
                className={`filters-button ${
                  view === "grid" ? "active" : ""
                }`}
                onClick={() => setView("grid")}
                role="tab"
                aria-selected={view === "grid"}
              >
                ▦
              </button>
              <button
                className={`filters-button ${
                  view === "list" ? "active" : ""
                }`}
                onClick={() => setView("list")}
                role="tab"
                aria-selected={view === "list"}
              >
                ☰
              </button>
            </div>

            {isWebView && (
              <button
                className="filters-button primary"
                disabled={selected.size === 0}
                onClick={handleBulkSave}
              >
                Add {selected.size || ""} to Pipeline
              </button>
            )}
          </>
        }
      />

      {/* 🔹 Main Leads Layout */}
      <div className="leads-layout">
        <div className={`leads-list-panel ${view}`}>
          {isWebView && (
            <div className="inbox-tabs" role="tablist" aria-label="Lead inbox">
              <button className="inbox-tab active" role="tab" aria-selected="true">
                New Requests
              </button>
              <button className="inbox-tab" role="tab" aria-selected="false" disabled>
                Archived
              </button>
              <button className="inbox-tab" role="tab" aria-selected="false" disabled>
                Spam
              </button>
            </div>
          )}
          <h2 className="lead-section-title">
            {listTitle} • {listCount} result
            {listCount === 1 ? "" : "s"}
            {!isWebView && crmStatus && ` (${statusLabel})`}
          </h2>

          {listLoading && <p className="loading">Loading…</p>}
          {listError && <p className="error">{listError}</p>}

          {!listLoading && !listError && isWebView && filteredLeads.length > 0 && (
            <div className={`lead-grid ${view}`}>
              {filteredLeads.map((lead) => {
                const leadKey = `web-${lead.id ?? lead.created_at}`;
                const selectable = lead.id != null;
                return (
                  <div
                    key={leadKey}
                    className={
                      selectable
                        ? `selectable ${selected.has(lead.id) ? "selected" : ""}`
                        : ""
                    }
                  >
                    {selectable && (
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleOne(lead.id)}
                        />
                      </label>
                    )}

                    <TianLeads
                      bare
                      leads={[lead]}
                      onSaveToCrm={handleSaveToCrm}
                      onArchive={handleArchive}
                      onSpam={handleSpam}
                      onViewInPipeline={() => navigate("/leads/pipeline")}
                      mode="website"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {!listLoading && !listError && !isWebView && filteredCrmLeads.length > 0 && (
            <div className={`lead-grid ${view}`}>
              <TianLeads
                bare
                leads={filteredCrmLeads}
                mode="crm"
                onLeadClick={(lead) => setActiveLead(lead)}
              />
            </div>
          )}

          {!listLoading && !listError && listCount === 0 && (
            <div className="empty">No leads match your filters.</div>
          )}
        </div>

        {/* 🔹 AI Assistant */}
        <div className="leads-right-panel">
          <div className="ai-assistant-box">
            <Assistant
              context="leads"
              placeholder="Ask: summarize leads, draft SMS, rank by intent…"
            />
          </div>

          {listError && isWebView && (
            <div className="error" style={{ marginTop: 8 }}>
              {listError}
            </div>
          )}
        </div>
      </div>

      {activeLead && (
        <CustomerPopup
          lead={activeLead}
          leadType="lead"
          onClose={() => {
            setActiveLead(null);
            loadInboxLeads();
            loadCrmLeads();
          }}
        />
      )}
    </div>
  );
}
