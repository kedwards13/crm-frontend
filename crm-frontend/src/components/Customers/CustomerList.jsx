// ---------------------------------------------------------
// CustomersList - CRM Table
// ---------------------------------------------------------
import React, {
  useState,
  useEffect,
  useRef,
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

import { toast } from "react-toastify";
import { Brain, Eye, Zap } from "lucide-react";
import { mapEntity } from "../../utils/contactMapper";
import { getIndustry } from "../../helpers/tenantHelpers";
import { getIndustryCopy } from "../../constants/industryCopy";

import "./CustomerList.css";

const CustomerPopup = lazy(() => import("../Profile/CustomerPopup"));

// ---------------------------------------------------------
// ROW - optimized for speed
// ---------------------------------------------------------
const CustomerRow = memo(({ c, checked, toggleCheck, openPopup }) => {
  const mapped = mapEntity(c);

  return (
    <tr className="gt-row" onClick={() => openPopup(mapped)}>
      <td className="gt-cell center w10">
        <input
          type="checkbox"
          className="gt-checkbox"
          checked={checked.includes(c.customer_id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleCheck(c.customer_id)}
        />
      </td>

      <td className="gt-cell name-col">
        {c.first_name} {c.last_name}
      </td>

      <td className="gt-cell">{c.primary_email || "N/A"}</td>
      <td className="gt-cell">{c.primary_phone || "N/A"}</td>
      <td className="gt-cell">{c.city || "N/A"}</td>
      <td className="gt-cell">{c.state || "N/A"}</td>

      <td className="gt-cell summary-col">
        {c.ai_summary?.slice(0, 90) || "N/A"}
      </td>

      <td className="gt-cell center">
        {c.is_enriched ? <span className="gt-badge-ok">Yes</span> : "N/A"}
      </td>

      <td className="gt-cell actions-col">
        <div className="gt-actions">
          <button
            title="View Profile"
            onClick={(e) => {
              e.stopPropagation();
              openPopup(mapped);
            }}
            className="gt-icon-btn blue"
          >
            <Eye size={15} />
          </button>

          <button
            title="AI Enrich"
            onClick={(e) => {
              e.stopPropagation();
              enrichBulk([c.customer_id]);
              toast.info(`Enriching ${c.first_name}...`);
            }}
            className="gt-icon-btn green"
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
  const [search, setSearch] = useState(localStorage.getItem("customerSearch") || "");
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

  const [checked, setChecked] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState("");

  const debounceRef = useRef(null);

  // ---------------------- Load customers ----------------------
  const fetchCustomers = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await getCustomers(search ? { q: search } : {});
      setCustomers(data.results || data);
    } catch (err) {
      console.error(err);
      setError("Failed to load customers.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data } = await getCustomerMetrics();
      setMetrics(data);
    } catch {}
  };

  useEffect(() => {
    localStorage.setItem("customerSearch", search);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
    fetchMetrics();
  }, []);

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
  }, [location.pathname, location.state, navigate]);

  // ---------------------- Bulk actions ----------------------
  const toggleCheck = (id) =>
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setChecked(
      checked.length === customers.length
        ? []
        : customers.map((c) => c.customer_id)
    );

  const bulkEnrich = async () => {
    if (!checked.length) return toast.info(`Select ${customersLower}.`);

    setEnriching(true);

    try {
      await enrichBulk(checked);
      toast.success("Enrichment started.");
      fetchCustomers();
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

    try {
      await assignToCampaign(campaignId, checked);
      toast.success("Campaign assigned.");
      setChecked([]);
    } catch {
      toast.error("Assignment failed.");
    }
  };

  // ---------------------- Render ----------------------
  return (
    <div className="gt-customerlist">

      {/* Toolbar */}
      <div className="gt-toolbar">
        <input
          className="gt-search"
          value={search}
          placeholder={`Search ${customersLower}...`}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="gt-toolbar-actions">
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

          <button
            className="gt-btn blue"
            disabled={!checked.length}
            onClick={bulkAssign}
          >
            Assign
          </button>

          <button
            className="gt-btn green"
            disabled={!checked.length || enriching}
            onClick={bulkEnrich}
          >
            {enriching ? "Enriching..." : "AI Enrich"}
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="gt-metrics">
          {[
            [copy.customers, metrics.total_customers],
            ["Active", metrics.active_customers],
            ["Enriched", metrics.enriched_customers],
            ["No-Show Rate", `${metrics.no_show_rate}%`],
            ["Avg Visits", metrics.average_visits_per_customer],
          ].map(([label, value]) => (
            <div key={label} className="gt-metric-card">
              <div className="label">{label}</div>
              <div className="value">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {error && <div className="gt-error">{error}</div>}

      {loading ? (
        <div className="gt-loading">Loading {customersLower}...</div>
      ) : !customers.length ? (
        <div className="gt-empty">No {customersLower} found.</div>
      ) : (
        <div className="gt-table-wrapper">
          <table className="gt-table">
            <thead>
              <tr>
                <th className="center w10">
                  <input
                    type="checkbox"
                    className="gt-checkbox"
                    checked={checked.length === customers.length}
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
              {customers.map((c) => (
                <CustomerRow
                  key={c.customer_id}
                  c={c}
                  checked={checked}
                  toggleCheck={toggleCheck}
                  openPopup={(mapped) => setSelected(mapped)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Popup */}
      {selected && (
        <Suspense fallback={<div className="gt-loading p-6">Loading...</div>}>
          <CustomerPopup
            lead={selected}
            leadType="customer"
            onClose={() => {
              setSelected(null);
              fetchCustomers();
              fetchMetrics();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
