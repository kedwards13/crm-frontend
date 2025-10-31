import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import TianLeads from "./TianLeads";
import Assistant from "../Assistant/Assistant";
import FiltersBar from "../Layout/FiltersBar";
import { AuthContext } from "../../App";
import api from "../../apiClient";
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
  const { isAuthenticated, token } = useContext(AuthContext);

  const [webLeads, setWebLeads] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [loadingWeb, setLoadingWeb] = useState(false);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [errorWeb, setErrorWeb] = useState("");
  const [errorCrm, setErrorCrm] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedQuery = useDebouncedValue(query, 250);
  const didRef = useRef(false);
  const searchRef = useRef(null);

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

  // Load leads (web + CRM)
  useEffect(() => {
    if (!isAuthenticated || !token) return navigate("/login");
    if (didRef.current) return;
    didRef.current = true;

    (async () => {
      setLoadingWeb(true);
      setErrorWeb("");
      try {
        const resWeb = await api.get("/leads/web-leads/");
        const rows = Array.isArray(resWeb.data)
          ? resWeb.data
          : resWeb.data?.results || [];
        setWebLeads(rows);
      } catch (e) {
        setErrorWeb(e.message || "Web lead fetch failed");
      } finally {
        setLoadingWeb(false);
      }

      setLoadingCrm(true);
      setErrorCrm("");
      try {
        const resCrm = await api.get("/leads/crm-leads/");
        const rows = Array.isArray(resCrm.data)
          ? resCrm.data
          : resCrm.data?.results || [];
        setCrmLeads(rows);
      } catch (e) {
        setErrorCrm(e.message || "CRM lead fetch failed");
      } finally {
        setLoadingCrm(false);
      }
    })();
  }, [isAuthenticated, token, navigate]);

  // Filtering + Sorting logic
  const filteredLeads = useMemo(() => {
    let rows = Array.isArray(webLeads) ? [...webLeads] : [];

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const fields = [
          r.name,
          r.email,
          r.phone_number,
          r.message,
          r.address,
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
        return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "oldest")
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return rows;
  }, [webLeads, debouncedQuery, sortBy, dateFrom, dateTo]);

  // Selection logic
  const allVisibleIds = filteredLeads.map((r) => r.id);
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
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Save handlers
  const handleSaveToCrm = async (webLead) => {
    try {
      await api.post("/leads/transfer-lead/", { lead_id: webLead.id });
      setWebLeads((rows) => rows.filter((r) => r.id !== webLead.id));
      const res = await api.get("/leads/crm-leads/");
      const newRows = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setCrmLeads(newRows);
    } catch (err) {
      alert(`Save to CRM failed: ${String(err).slice(0, 200)}`);
    }
  };

  const handleBulkSave = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    for (const id of ids) {
      const lead = webLeads.find((r) => r.id === id);
      if (lead) await handleSaveToCrm(lead);
    }
    setSelected(new Set());
  };

  // Filter reset
  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  };

  return (
    <div className="leads-page">
      {/* 🔹 Filters */}
      <FiltersBar
        left={
          <button
            className="filters-button"
            onClick={toggleAll}
            title={
              allSelected ? "Unselect all visible" : "Select all visible leads"
            }
          >
            {allSelected ? "☑︎" : "☐"}
          </button>
        }
        center={
          <>
            <input
              ref={searchRef}
              className="filters-input"
              placeholder="Search name, email, phone, address…"
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

            <button
              className="filters-button primary"
              disabled={selected.size === 0}
              onClick={handleBulkSave}
            >
              Save {selected.size || ""} to CRM
            </button>
          </>
        }
      />

      {/* 🔹 Main Leads Layout */}
      <div className="leads-layout">
        <div className={`leads-list-panel ${view}`}>
          <h2 className="lead-section-title">
            Intake • {filteredLeads.length} result
            {filteredLeads.length === 1 ? "" : "s"}
          </h2>

          {loadingWeb && <p className="loading">Loading…</p>}
          {errorWeb && <p className="error">{errorWeb}</p>}

          {!loadingWeb && !errorWeb && filteredLeads.length > 0 && (
            <div className={`lead-grid ${view}`}>
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={`selectable ${
                    selected.has(lead.id) ? "selected" : ""
                  }`}
                >
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleOne(lead.id)}
                    />
                  </label>

                  <TianLeads
                    bare
                    leads={[lead]}
                    onLeadClick={() => {}}
                    onSaveToCrm={handleSaveToCrm}
                    mode="website"
                  />
                </div>
              ))}
            </div>
          )}

          {!loadingWeb && !errorWeb && filteredLeads.length === 0 && (
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

          {errorCrm && (
            <div className="error" style={{ marginTop: 8 }}>
              {errorCrm}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}