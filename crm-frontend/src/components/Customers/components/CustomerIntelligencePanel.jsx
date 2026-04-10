import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import {
  executeAnalyticsAction,
  getOperationalWorkspace,
} from "../../../api/analyticsApi";
import { getUserRole } from "../../../helpers/tenantHelpers";
import "./CustomerIntelligencePanel.css";

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const toAccessContext = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (["owner", "admin", "superuser"].includes(role)) return "owner";
  if (["manager", "admin_manager"].includes(role)) return "manager";
  if (["technician", "tech", "field_tech", "fieldtech", "installer", "instructor"].includes(role)) {
    return "technician";
  }
  return "operator";
};

const toPercent = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n * 100)}%`;
};

const actionVerb = (action) => {
  const classification = String(action?.safety_classification || "").trim().toLowerCase();
  if (classification === "safe_auto") return "Run";
  if (classification === "suggest_only") return "Draft";
  return "Review";
};

const actionTone = (action) => {
  const classification = String(action?.safety_classification || "").trim().toLowerCase();
  if (classification === "safe_auto") return "cip-action-btn is-safe";
  if (classification === "suggest_only") return "cip-action-btn is-suggest";
  return "cip-action-btn is-approval";
};

export default function CustomerIntelligencePanel({
  customerId,
  leadId,
  entityType,
  entityId,
  accessContext,
  title = "Operating Intelligence",
  subtitle = "AI augments the CRM here without replacing the primary customer workflow.",
  compact = false,
  enabled = true,
  availabilityLoading = false,
  disabledReason = "",
  eyebrow = "AI Insight",
}) {
  const resolvedAccessContext = useMemo(
    () => String(accessContext || toAccessContext(getUserRole("Member"))).trim(),
    [accessContext]
  );
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({});
  const [refreshNonce, setRefreshNonce] = useState(0);

  const requestParams = useMemo(() => {
    const params = { access_context: resolvedAccessContext };
    if (customerId) {
      params.customer_id = customerId;
      return params;
    }
    if (leadId) {
      params.lead_id = leadId;
      return params;
    }
    if (entityType && entityId) {
      params.entity_type = entityType;
      params.entity_id = entityId;
      return params;
    }
    return null;
  }, [customerId, entityId, entityType, leadId, resolvedAccessContext]);

  useEffect(() => {
    let mounted = true;
    if (!requestParams || !enabled || availabilityLoading) {
      setWorkspace(null);
      setLoading(false);
      setError("");
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getOperationalWorkspace(requestParams);
        if (!mounted) return;
        setWorkspace(response?.data || null);
      } catch (err) {
        if (!mounted) return;
        setWorkspace(null);
        setError(err?.response?.data?.detail || err?.message || "Unable to load operating intelligence.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [availabilityLoading, enabled, requestParams, refreshNonce]);

  const brief = workspace?.pre_service_brief || {};
  const alerts = asList(workspace?.alerts);
  const segments = asList(workspace?.segments);
  const recommendedActions = asList(workspace?.recommended_actions);
  const memories = asList(workspace?.operational_context?.memories).slice(0, compact ? 2 : 4);
  const exclusions = asList(workspace?.exclusions || workspace?.operational_context?.exclusions);
  const confidence = workspace?.confidence || {};

  const handleAction = async (action) => {
    if (!action?.action_type) return;
    const actionKey = `${action.action_type}:${JSON.stringify(action.payload || {})}`;
    setActionState((prev) => ({
      ...prev,
      [actionKey]: { loading: true, message: "", error: "" },
    }));
    try {
      const response = await executeAnalyticsAction(action.action_type, action.payload || {});
      const result = response?.data || {};
      setActionState((prev) => ({
        ...prev,
        [actionKey]: {
          loading: false,
          message:
            result?.result?.message ||
            result?.status ||
            `${actionVerb(action)} request processed.`,
          error: "",
        },
      }));
      if (String(result?.safety_classification || "").trim().toLowerCase() === "safe_auto") {
        const refreshed = await getOperationalWorkspace(requestParams);
        setWorkspace(refreshed?.data || null);
      }
    } catch (err) {
      setActionState((prev) => ({
        ...prev,
        [actionKey]: {
          loading: false,
          message: "",
          error: err?.response?.data?.detail || err?.message || "Unable to execute action.",
        },
      }));
    }
  };

  if (!requestParams) {
    return (
      <section className={`cip-shell ${compact ? "is-compact" : ""}`}>
        <div className="cip-empty">Link a CRM customer or lead to unlock operating intelligence.</div>
      </section>
    );
  }

  return (
    <section className={`cip-shell ${compact ? "is-compact" : ""}`}>
      <div className="cip-header">
        <div>
          <div className="cip-eyebrow">{eyebrow}</div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {enabled && !availabilityLoading ? (
          <button
            type="button"
            className="cip-refresh"
            onClick={() => setRefreshNonce((value) => value + 1)}
            title="Refresh intelligence"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        ) : null}
      </div>

      {availabilityLoading ? <div className="cip-banner">Checking tenant AI availability…</div> : null}
      {!availabilityLoading && !enabled ? (
        <div className="cip-banner is-disabled">
          {disabledReason || "AI is disabled for this tenant. Core CRM data remains fully available."}
        </div>
      ) : null}
      {loading ? <div className="cip-banner">Building tenant-safe context…</div> : null}
      {error ? <div className="cip-banner is-error">{error}</div> : null}

      {workspace && enabled ? (
        <div className="cip-grid">
          <div className="cip-card">
            <div className="cip-card-head">
              <Sparkles size={16} />
              <strong>AI Insight • Pre-Service Brief</strong>
            </div>
            <div className="cip-stat-row">
              <div>
                <span>Brief Confidence</span>
                <strong>{toPercent(brief?.confidence ?? confidence?.brief)}</strong>
              </div>
              <div>
                <span>Context Confidence</span>
                <strong>{toPercent(confidence?.context)}</strong>
              </div>
              <div>
                <span>Access Context</span>
                <strong>{workspace?.access_context || resolvedAccessContext}</strong>
              </div>
            </div>
            <div className="cip-columns">
              <div>
                <h4>Risks</h4>
                <ul>{asList(brief?.risks).slice(0, compact ? 2 : 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>Recurring Issues</h4>
                <ul>
                  {asList(brief?.recurring_issues).slice(0, compact ? 2 : 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Failed Treatments</h4>
                <ul>
                  {asList(brief?.failed_treatments).slice(0, compact ? 2 : 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="cip-chip-row">
              {asList(brief?.customer_flags).map((flag) => (
                <span key={flag} className="cip-chip">
                  {flag.replaceAll("_", " ")}
                </span>
              ))}
              {segments.map((segment) => (
                <span key={segment} className="cip-chip is-segment">
                  {segment.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </div>

          <div className="cip-card">
            <div className="cip-card-head">
              <AlertTriangle size={16} />
              <strong>AI Insight • Alerts</strong>
            </div>
            <div className="cip-stack">
              {alerts.length ? (
                alerts.slice(0, compact ? 3 : 6).map((alert, index) => (
                  <div key={`${alert?.type || "alert"}-${index}`} className="cip-alert">
                    <span className={`cip-priority is-${String(alert?.priority || "medium").toLowerCase()}`}>
                      {String(alert?.priority || "medium")}
                    </span>
                    <div>
                      <strong>{alert?.type || "risk"}</strong>
                      <p>{alert?.message || "Operational signal detected."}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="cip-empty">No current operational alerts.</div>
              )}
            </div>
          </div>

          <div className="cip-card">
            <div className="cip-card-head">
              <Wrench size={16} />
              <strong>AI Insight • Recommended Actions</strong>
            </div>
            <div className="cip-stack">
              {recommendedActions.length ? (
                recommendedActions.map((action) => {
                  const actionKey = `${action.action_type}:${JSON.stringify(action.payload || {})}`;
                  const state = actionState[actionKey] || {};
                  return (
                    <div key={actionKey} className="cip-action">
                      <div>
                        <strong>{action.title || action.action_type}</strong>
                        <p>{action.reason}</p>
                        <span className="cip-meta">
                          {action.safety_classification} • {toPercent(action.confidence)}
                        </span>
                      </div>
                      <div className="cip-action-controls">
                        <button
                          type="button"
                          className={actionTone(action)}
                          onClick={() => handleAction(action)}
                          disabled={Boolean(state.loading)}
                        >
                          {state.loading ? "Working…" : actionVerb(action)}
                        </button>
                        {state.message ? <span className="cip-result">{state.message}</span> : null}
                        {state.error ? <span className="cip-result is-error">{state.error}</span> : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="cip-empty">No AI actions are queued for this record.</div>
              )}
            </div>
          </div>

          <div className="cip-card">
            <div className="cip-card-head">
              <ShieldCheck size={16} />
              <strong>Safe Context Notes</strong>
            </div>
            <div className="cip-stack">
              {memories.length ? (
                memories.map((memory) => (
                  <div key={memory.id} className="cip-memory">
                    <span>{memory.memory_type}</span>
                    <p>{memory.text}</p>
                  </div>
                ))
              ) : (
                <div className="cip-empty">No safe operational notes are available yet.</div>
              )}
            </div>
            {exclusions.length ? (
              <div className="cip-exclusions">
                {exclusions.map((item) => (
                  <span key={item}>{item.replaceAll("_", " ")}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
