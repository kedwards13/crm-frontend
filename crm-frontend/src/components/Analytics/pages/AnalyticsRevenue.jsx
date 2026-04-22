import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPlanningScenario,
  deletePlanningScenario,
  explainAnalyticsSummary,
  executeAnalyticsAction,
  getCostConfiguration,
  getExecutableMetricPreview,
  getRevenueDaily,
  getRevenueMonthly,
  getRevenueSummary,
  listPlanningScenarios,
  runSmartAnalyticsQuery,
  saveAnalyticsAudience,
  updateCostConfiguration,
  updatePlanningScenario,
} from "../../../api/analyticsApi";
import { createCampaign } from "../../../api/campaignsApi";
import WidgetPanel from "../../ui/WidgetPanel";
import "./AnalyticsShared.css";

const DATE_PRESETS = [
  { key: "today", label: "Today", days: 1 },
  { key: "this_week", label: "This Week", days: 7 },
  { key: "this_month", label: "This Month", days: 30 },
  { key: "last_month", label: "Last Month", days: 60 },
  { key: "this_year", label: "This Year", days: 365 },
];

const emptyScenario = {
  name: "Baseline",
  scenario_type: "baseline",
  is_default: false,
  target_monthly_revenue: "",
  target_annual_revenue: "",
  average_job_value: "",
  close_rate: "",
  lead_to_quote_rate: "",
  technician_capacity: "",
  sales_capacity: "",
  cac_by_channel: { google: "", meta: "" },
  notes: "",
};

const emptyCostConfig = {
  fixed_overhead_monthly: "",
  marketing_monthly: "",
  payroll_monthly: "",
  fuel_monthly: "",
  materials_monthly: "",
  software_monthly: "",
  notes: "",
};

const safeArray = (value) => (Array.isArray(value) ? value : []);
const REQUIRED_PLANNING_FIELDS = [
  "target_annual_revenue",
  "average_job_value",
  "close_rate",
  "lead_to_quote_rate",
];
const COST_NUMERIC_FIELDS = [
  "fixed_overhead_monthly",
  "marketing_monthly",
  "payroll_monthly",
  "fuel_monthly",
  "materials_monthly",
  "software_monthly",
];

const toMoney = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const toPercent = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
};

const toConfidence = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
};

const parseNumericInput = (value) => {
  // SAFE: normalize formatted UI values before they ever reach the API.
  if (value === null || value === undefined) return { value: null, valid: true, empty: true };
  if (value === "" || value === "—") return { value: null, valid: true, empty: true };
  const cleaned = String(value).replace(/[$,]/g, "").trim();
  if (!cleaned || cleaned === "—") return { value: null, valid: true, empty: true };
  const num = Number(cleaned);
  if (Number.isNaN(num)) return { value: null, valid: false, empty: false };
  return { value: num, valid: true, empty: false };
};

const asRows = (entries) =>
  entries.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—");

const compactMetric = (summary, key) => ({
  key,
  label:
    summary?.definitions?.[key]?.label ||
    summary?.metrics?.[key]?.label ||
    key.replaceAll("_", " "),
  value: summary?.metrics?.[key]?.value,
  confidence: summary?.metrics?.[key]?.confidence,
  exclusions: safeArray(summary?.metrics?.[key]?.exclusions),
  explanation: summary?.metrics?.[key]?.explanation,
  definition: summary?.definitions?.[key] || null,
});

const planningFieldLabel = (field) =>
  ({
    target_annual_revenue: "Target Annual Revenue",
    target_monthly_revenue: "Target Monthly Revenue",
    average_job_value: "Average Job Value",
    close_rate: "Close Rate",
    lead_to_quote_rate: "Lead to Quote Rate",
    technician_capacity: "Technician Capacity",
    sales_capacity: "Sales Capacity",
    cac_by_channel: "CAC by Channel",
    "cac_by_channel.google": "Google CAC",
    "cac_by_channel.meta": "Meta CAC",
  }[field] || field.replaceAll("_", " "));

const formatMetricValue = (key, value) =>
  String(key || "").includes("rate") || String(key || "").includes("margin") ? toPercent(value) : toMoney(value);

const analyzePlanningForm = (form) => {
  const invalidFields = [];
  const values = {};

  [
    "target_monthly_revenue",
    "target_annual_revenue",
    "average_job_value",
    "close_rate",
    "lead_to_quote_rate",
    "technician_capacity",
    "sales_capacity",
  ].forEach((field) => {
    const parsed = parseNumericInput(form?.[field]);
    values[field] = parsed.value;
    if (!parsed.valid) invalidFields.push(field);
  });

  const cacByChannel = {};
  ["google", "meta"].forEach((field) => {
    const parsed = parseNumericInput(form?.cac_by_channel?.[field]);
    cacByChannel[field] = parsed.value;
    if (!parsed.valid) invalidFields.push(`cac_by_channel.${field}`);
  });

  const missingRequiredFields = REQUIRED_PLANNING_FIELDS.filter((field) => values[field] == null);

  return {
    invalidFields,
    missingRequiredFields,
    payload: {
      name: String(form?.name || "Scenario").trim() || "Scenario",
      scenario_type: form?.scenario_type || "custom",
      is_default: Boolean(form?.is_default),
      ...values,
      cac_by_channel: cacByChannel,
      notes: String(form?.notes || ""),
    },
  };
};

const buildCostPayload = (form) => {
  const payload = { notes: String(form?.notes || "") };
  const invalidFields = [];
  COST_NUMERIC_FIELDS.forEach((field) => {
    const parsed = parseNumericInput(form?.[field]);
    payload[field] = parsed.value;
    if (!parsed.valid) invalidFields.push(field);
  });
  return { payload, invalidFields };
};

const scenarioToForm = (scenario) => {
  if (!scenario) return emptyScenario;
  return {
    name: scenario.name || "Scenario",
    scenario_type: scenario.scenario_type || "custom",
    is_default: Boolean(scenario.is_default),
    target_monthly_revenue: scenario.target_monthly_revenue ?? "",
    target_annual_revenue: scenario.target_annual_revenue ?? "",
    average_job_value: scenario.average_job_value ?? "",
    close_rate: scenario.close_rate ?? "",
    lead_to_quote_rate: scenario.lead_to_quote_rate ?? "",
    technician_capacity: scenario.technician_capacity ?? "",
    sales_capacity: scenario.sales_capacity ?? "",
    cac_by_channel: {
      google: scenario?.cac_by_channel?.google ?? "",
      meta: scenario?.cac_by_channel?.meta ?? "",
    },
    notes: scenario.notes || "",
  };
};

const costToForm = (configuration) => ({
  fixed_overhead_monthly: configuration?.fixed_overhead_monthly ?? "",
  marketing_monthly: configuration?.marketing_monthly ?? "",
  payroll_monthly: configuration?.payroll_monthly ?? "",
  fuel_monthly: configuration?.fuel_monthly ?? "",
  materials_monthly: configuration?.materials_monthly ?? "",
  software_monthly: configuration?.software_monthly ?? "",
  notes: configuration?.notes || "",
});

function PairTable({ rows, emptyLabel = "No data available." }) {
  if (!rows.length) return <div className="analytics-empty">{emptyLabel}</div>;
  return (
    <div className="analytics-table analytics-table--tight">
      {rows.map(([label, value]) => (
        <div key={String(label)} className="analytics-table-row analytics-table-row--pair">
          <strong>{label}</strong>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

function MetricTitle({ label, definition }) {
  if (!definition) return label;
  return (
    <span className="analytics-metric-title">
      <span>{label}</span>
      <span className="analytics-tooltip">
        <button type="button" className="analytics-metric-help" aria-label={`Explain ${label}`}>
          ?
        </button>
        <span className="analytics-tooltip-card" role="tooltip">
          <strong>{definition.label || label}</strong>
          {definition.description ? <span>{definition.description}</span> : null}
          {definition.formula ? <span>Formula: {definition.formula}</span> : null}
          {definition.warning ? <span>Warning: {definition.warning}</span> : null}
        </span>
      </span>
    </span>
  );
}

export default function AnalyticsRevenue() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [datePreset, setDatePreset] = useState("this_month");
  const [summary, setSummary] = useState({});
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [scenarioForm, setScenarioForm] = useState(emptyScenario);
  const [costForm, setCostForm] = useState(emptyCostConfig);
  const [drilldown, setDrilldown] = useState(null);
  const [smartQuery, setSmartQuery] = useState("");
  const [smartResults, setSmartResults] = useState(null);
  const [smartLoading, setSmartLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [spokenNarrative, setSpokenNarrative] = useState("");
  const [voiceSourceMetrics, setVoiceSourceMetrics] = useState({});
  const [lastNarrativeKey, setLastNarrativeKey] = useState("");
  const explainRequestRef = useRef(0);

  const presetDays = DATE_PRESETS.find((preset) => preset.key === datePreset)?.days || 30;

  const load = useCallback(async ({ scenario = null } = {}) => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, dailyRes, monthlyRes, scenariosRes, costRes] = await Promise.all([
        getRevenueSummary(
          scenario?.target_annual_revenue
            ? { target_annual_revenue: scenario.target_annual_revenue }
            : {}
        ),
        getRevenueDaily({ days: presetDays }).catch(() => ({ data: [] })),
        getRevenueMonthly().catch(() => ({ data: [] })),
        listPlanningScenarios().catch(() => ({ data: { results: [] } })),
        getCostConfiguration().catch(() => ({ data: {} })),
      ]);
      const nextSummary = summaryRes?.data || {};
      const nextScenarios = safeArray(scenariosRes?.data?.results);
      const nextCostConfig = costRes?.data?.configuration || null;
      setSummary(nextSummary);
      setSpokenNarrative("");
      setVoiceSourceMetrics({});
      setLastNarrativeKey("");
      setDaily(safeArray(dailyRes?.data?.results || dailyRes?.data));
      setMonthly(safeArray(monthlyRes?.data?.results || monthlyRes?.data));
      setScenarios(nextScenarios);
      setCostForm(costToForm(nextCostConfig));
      const scenarioFromSummary = nextSummary?.planning?.scenario;
      const preferredScenario =
        scenarioFromSummary ||
        nextScenarios.find((item) => item.is_default) ||
        nextScenarios[0] ||
        null;
      setSelectedScenarioId(preferredScenario?.id ? String(preferredScenario.id) : "");
      setScenarioForm(scenarioToForm(preferredScenario));
    } catch (err) {
      setError(err?.message || "Unable to load financial intelligence.");
    } finally {
      setLoading(false);
    }
  }, [presetDays]);

  useEffect(() => {
    load();
  }, [load]);

  const model = String(summary?.model || "");
  const isRecurring = model === "recurring";
  const isHybrid = model === "hybrid";
  const anomalies = useMemo(() => safeArray(summary?.anomalies), [summary]);
  const actionToday = useMemo(() => summary?.action_today || {}, [summary]);
  const priorityRisks = safeArray(actionToday?.priority_risks);
  const priorityActions = safeArray(actionToday?.priority_actions);
  const dataQualityMessages = safeArray(summary?.data_quality?.messages);
  const costMessages = safeArray(summary?.cost_summary?.messages);
  const exclusions = safeArray(summary?.exclusions);
  const ownerLeaderboard = safeArray(summary?.owner_leaderboard);
  const missingPlanningInputs = safeArray(summary?.planning?.missing_fields);
  const narrative = summary?.narrative || {};
  const planningAnalysis = useMemo(() => analyzePlanningForm(scenarioForm), [scenarioForm]);
  const invalidPlanningFields = planningAnalysis.invalidFields;
  const missingPlanningFormFields = planningAnalysis.missingRequiredFields;
  const costAnalysis = useMemo(() => buildCostPayload(costForm), [costForm]);
  const highlightedPlanningFields = useMemo(
    () => new Set([...missingPlanningInputs, ...missingPlanningFormFields, ...invalidPlanningFields]),
    [invalidPlanningFields, missingPlanningFormFields, missingPlanningInputs]
  );

  // Map date preset → period_views key for period-specific metrics
  const periodKey = datePreset === "this_year" ? "trailing_365"
    : datePreset === "last_month" ? "trailing_90"
    : "trailing_30"; // this_month, this_week, today all use trailing_30
  const pv = summary?.period_views?.[periodKey];
  const periodLabel = DATE_PRESETS.find((p) => p.key === datePreset)?.label || "This Month";

  const financialRows = useMemo(
    () =>
      asRows([
        ["Revenue Model", model.replaceAll("_", " ") || "—"],
        [`Booked Revenue (${periodLabel})`, toMoney(pv?.booked_revenue ?? summary?.booked_revenue)],
        [`Collected Revenue (${periodLabel})`, toMoney(pv?.collected_revenue ?? summary?.collected_revenue)],
        ["Remaining Revenue", toMoney(summary?.remaining_revenue)],
        ["Active Revenue", toMoney(summary?.active_revenue)],
        ["Inactive Revenue", toMoney(summary?.inactive_revenue)],
        [isRecurring || isHybrid ? "Active MRR" : "Conversion Rate", isRecurring || isHybrid ? toMoney(summary?.mrr) : toPercent(summary?.conversion_rate)],
        ["Orphan Quotes", toNumber(summary?.orphan_quote_count)],
      ]),
    [isHybrid, isRecurring, model, summary, pv, periodLabel]
  );

  const profitRows = useMemo(
    () =>
      asRows([
        [`Gross Profit (${periodLabel})`, toMoney(pv?.gross_profit ?? summary?.gross_profit)],
        ["Gross Margin", toPercent(pv?.gross_margin ?? summary?.gross_margin)],
        [`Costs (${periodLabel})`, toMoney(pv?.costs)],
        [`Net Profit (${periodLabel})`, toMoney(pv?.net_profit ?? summary?.net_profit_proxy)],
        ["CAC", toMoney(summary?.cac)],
        ["LTV:CAC", summary?.ltv_cac_ratio != null ? Number(summary.ltv_cac_ratio).toFixed(2) : "—"],
      ]),
    [summary, pv, periodLabel]
  );

  const planningRows = useMemo(
    () =>
      asRows([
        ["Scenario", summary?.planning?.scenario?.name || "Not configured"],
        ["Status", summary?.planning?.status || "incomplete"],
        ["Target Annual Revenue", toMoney(summary?.planning?.target_annual_revenue)],
        ["Revenue Gap", toMoney(summary?.planning?.revenue_gap)],
        ["Required Closed Jobs", toNumber(summary?.planning?.required_closed_jobs)],
        ["Required Quotes", toNumber(summary?.planning?.required_quote_volume)],
        ["Required Leads", toNumber(summary?.planning?.required_lead_volume)],
        ["Required Marketing Spend", toMoney(summary?.planning?.required_marketing_spend)],
        ["Required Technician Load", toNumber(summary?.planning?.required_technician_load)],
        ["Required Sales Capacity", toNumber(summary?.planning?.required_sales_capacity)],
      ]),
    [summary]
  );

  const forecastRows = useMemo(
    () =>
      asRows([
        ["Open Leads", toNumber(summary?.sales_flow_forecast?.open_lead_count)],
        ["Quoted Leads", toNumber(summary?.sales_flow_forecast?.quoted_lead_count)],
        ["Avg Estimate", toMoney(summary?.sales_flow_forecast?.avg_estimate_value)],
        ["Projected 30-Day Booked", toMoney(summary?.sales_flow_forecast?.projected_booked_revenue_30_day)],
        [isRecurring || isHybrid ? "Projected MRR" : null, isRecurring || isHybrid ? toMoney(summary?.sales_flow_forecast?.projected_mrr) : null],
      ]),
    [isHybrid, isRecurring, summary]
  );

  const costRows = useMemo(
    () =>
      asRows([
        ["Status", summary?.cost_summary?.status || "missing"],
        ["Direct Costs", toMoney(summary?.cost_summary?.direct_costs)],
        ["Payroll", toMoney(summary?.payroll_burden)],
        ["Fuel", toMoney(summary?.fuel_cost)],
        ["Materials", toMoney(summary?.material_cost)],
        ["Commission", toMoney(summary?.commission_cost)],
        ["Fixed Overhead", toMoney(summary?.cost_summary?.fixed_overhead_costs)],
        ["Growth Spend", toMoney(summary?.cost_summary?.growth_spend)],
      ]),
    [summary]
  );

  const topMetrics = useMemo(() => {
    const keys = isRecurring
      ? ["mrr", "paused_mrr", "churned_mrr", "booked_revenue", "collected_revenue", "remaining_revenue"]
      : ["booked_revenue", "collected_revenue", "remaining_revenue", "conversion_rate", "gross_profit", "net_profit_proxy"];
    return keys.map((key) => compactMetric(summary, key));
  }, [isRecurring, summary]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleOpenMetric = async (metricKey) => {
    setNotice("");
    try {
      const { data } = await getExecutableMetricPreview({ metric_key: metricKey, days: presetDays });
      setDrilldown(data);
    } catch (err) {
      setNotice(err?.message || "Unable to load drilldown.");
    }
  };

  const handleRunSmartQuery = async () => {
    const query = String(smartQuery || "").trim();
    if (!query) return;
    setSmartLoading(true);
    setNotice("");
    try {
      const { data } = await runSmartAnalyticsQuery({ q: query, limit: 24 });
      setSmartResults(data);
    } catch (err) {
      setNotice(err?.message || "Unable to run smart query.");
    } finally {
      setSmartLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    if (invalidPlanningFields.length) {
      setNotice(`Invalid planning inputs: ${invalidPlanningFields.map(planningFieldLabel).join(", ")}`);
      return;
    }
    setSaving(true);
    setNotice("");
    const payload = planningAnalysis.payload;
    try {
      if (selectedScenarioId) {
        await updatePlanningScenario(selectedScenarioId, payload);
      } else {
        await createPlanningScenario(payload);
      }
      await load();
      setNotice("Planning scenario saved.");
    } catch (err) {
      setNotice(err?.message || "Unable to save planning scenario.");
    } finally {
      setSaving(false);
    }
  };

  const handleExplainNarrative = useCallback(async ({ autoplay = true, force = true } = {}) => {
    const requestId = explainRequestRef.current + 1;
    explainRequestRef.current = requestId;
    setExplaining(true);
    setNotice("");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    try {
      const { data } = await explainAnalyticsSummary(summary);
      if (explainRequestRef.current !== requestId) return;
      const text = String(data?.text || narrative?.summary || "").trim();
      setSpokenNarrative(text);
      setVoiceSourceMetrics(data?.source_metrics || {});
      setLastNarrativeKey(String(summary?.generated_at || Date.now()));
      if (autoplay && text && typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      if (explainRequestRef.current !== requestId) return;
      const fallback = String(narrative?.summary || "").trim();
      setSpokenNarrative(fallback);
      setVoiceSourceMetrics({});
      if (force) {
        setLastNarrativeKey(String(summary?.generated_at || Date.now()));
      }
      setNotice(err?.message || "Unable to generate voice explanation.");
    } finally {
      if (explainRequestRef.current === requestId) {
        setExplaining(false);
      }
    }
  }, [narrative?.summary, summary]);

  const handleStopNarrative = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleDeleteScenario = async () => {
    if (!selectedScenarioId) return;
    setSaving(true);
    setNotice("");
    try {
      await deletePlanningScenario(selectedScenarioId);
      setSelectedScenarioId("");
      setScenarioForm(emptyScenario);
      await load({ scenario: null });
      setNotice("Planning scenario removed.");
    } catch (err) {
      setNotice(err?.message || "Unable to delete planning scenario.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCostConfiguration = async () => {
    const { payload, invalidFields } = costAnalysis;
    if (invalidFields.length) {
      setNotice(`Invalid cost inputs: ${invalidFields.map(planningFieldLabel).join(", ")}`);
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const { data } = await updateCostConfiguration(payload);
      setCostForm(costToForm(data?.configuration || null));
      await load();
      setNotice("Cost configuration saved.");
    } catch (err) {
      setNotice(err?.message || "Unable to save cost configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAudience = async (source) => {
    const audience = source?.audience_filter || drilldown?.audience_filter || smartResults?.audience_filter;
    const name = source?.title || drilldown?.title || smartResults?.title || "Saved Audience";
    if (!audience) return;
    setSaving(true);
    setNotice("");
    try {
      await saveAnalyticsAudience({
        name,
        entity_type: audience.entity_type || "customer",
        source_metric: audience.metric_key || audience.query || "manual",
        preview_count: source?.count || drilldown?.count || smartResults?.results?.length || 0,
        audience_filter: audience,
      });
      setNotice("Audience saved.");
    } catch (err) {
      setNotice(err?.message || "Unable to save audience.");
    } finally {
      setSaving(false);
    }
  };

  const buildRecipients = (source) =>
    safeArray(source?.records || source?.results)
      .map((row) => row?.recipient)
      .filter(Boolean);

  const handleCreateCampaignDraft = async (source) => {
    const recipients = buildRecipients(source);
    if (!recipients.length) return;
    setSaving(true);
    setNotice("");
    try {
      await createCampaign({
        name: `${source?.title || "Audience"} Draft`,
        description: "Created from operating intelligence drilldown. Review before sending.",
        channel: "sms",
        message: "Follow up with this audience using reviewed campaign copy.",
        recipients,
      });
      setNotice("Campaign draft created.");
    } catch (err) {
      setNotice(err?.message || "Unable to create campaign draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignFollowUp = async (source) => {
    const quoteIds = buildRecipients(source)
      .map((row) => row?.quote_id)
      .filter(Boolean);
    if (!quoteIds.length) {
      setNotice("No quotes available for follow-up on this drilldown.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const { data } = await executeAnalyticsAction("follow_up_quotes", {
        tenant_id: summary?.tenant_id,
        quote_ids: quoteIds,
      });
      const created = data?.result?.tasks_created ?? data?.tasks_created ?? 0;
      setNotice(`Follow-up tasks created: ${created}.`);
    } catch (err) {
      setNotice(err?.message || "Unable to assign follow-up.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const summaryKey = String(summary?.generated_at || "");
    if (!summaryKey || !anomalies.length || summaryKey === lastNarrativeKey) return;
    handleExplainNarrative({ autoplay: false, force: false });
  }, [anomalies.length, handleExplainNarrative, lastNarrativeKey, summary?.generated_at]);

  return (
    <div className="analytics-page-shell">
      <header className="analytics-page-head analytics-page-head--dense">
        <div>
          <p className="eyebrow">Operator Intelligence</p>
          <h1>Financial Truth + Action</h1>
          <span>
            System data stays primary. AI stays secondary. Missing inputs are shown as missing instead of implied as zero.
          </span>
        </div>
        <div className="analytics-head-actions">
          <div className="analytics-chip-row">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`analytics-chip analytics-chip--button ${datePreset === preset.key ? "is-active" : ""}`}
                onClick={() => setDatePreset(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="analytics-button-row">
            <button type="button" className="analytics-btn analytics-btn--ghost" disabled={explaining} onClick={() => handleExplainNarrative()}>
              {explaining ? "Explaining..." : spokenNarrative ? "Replay Explanation" : "Explain"}
            </button>
            <button type="button" className="analytics-btn analytics-btn--ghost" onClick={handleStopNarrative}>
              Stop
            </button>
          </div>
        </div>
      </header>

      {loading ? <div className="analytics-warn analytics-warn--info">Refreshing analytics…</div> : null}
      {error ? <div className="analytics-warn">{error}</div> : null}
      {notice ? <div className="analytics-warn analytics-warn--info">{notice}</div> : null}

      <div className="analytics-kpi-grid">
        {topMetrics.map((metric) => (
          <WidgetPanel
            key={metric.key}
            title={<MetricTitle label={metric.label} definition={metric.definition} />}
            subtitle={`System Data • confidence ${toConfidence(metric.confidence)}`}
          >
            <div className="analytics-kpi-value">
              {metric.label.toLowerCase().includes("rate") || metric.label.toLowerCase().includes("margin")
                ? toPercent(metric.value)
                : toMoney(metric.value)}
            </div>
            {metric.explanation ? (
              <div className="analytics-kpi-subtle">{metric.explanation}</div>
            ) : null}
          </WidgetPanel>
        ))}
      </div>

      <WidgetPanel title="Operator Narrative" subtitle="AI Insight • explainable summary with explicit next action">
        <div className="analytics-stack">
          <div className="analytics-note-card analytics-note-card--plain">
            <p>{narrative?.summary || "Narrative will appear once the summary is ready."}</p>
          </div>
          {safeArray(narrative?.issues).length ? (
            <div className="analytics-list">
              {safeArray(narrative.issues).map((issue) => (
                <div key={issue} className="analytics-note-card analytics-note-card--plain">
                  <p>{issue}</p>
                </div>
              ))}
            </div>
          ) : null}
          {narrative?.next_action ? (
            <div className="analytics-note-card analytics-note-card--action">
              <div className="analytics-note-head">
                <strong>Next Action</strong>
                <span>operator</span>
              </div>
              <p>{narrative.next_action}</p>
            </div>
          ) : null}
          {spokenNarrative ? (
            <div className="analytics-note-card analytics-note-card--plain">
              <div className="analytics-note-head">
                <strong>Voice Transcript</strong>
                <span>AI Insight</span>
              </div>
              <p>{spokenNarrative}</p>
            </div>
          ) : null}
          {Object.keys(voiceSourceMetrics || {}).length ? (
            <PairTable
              rows={asRows(
                Object.entries(voiceSourceMetrics).map(([key, metric]) => [
                  planningFieldLabel(key),
                  `${formatMetricValue(key, metric?.value)} • ${toConfidence(metric?.confidence)}`,
                ])
              )}
              emptyLabel="No grounded metrics available."
            />
          ) : null}
        </div>
      </WidgetPanel>

      <div className="analytics-two-col">
        <WidgetPanel title="What Needs Action Today" subtitle="AI Insight • typed risks and recommendations">
          <div className="analytics-stack">
            {priorityActions.length ? (
              <div className="analytics-list">
                {priorityActions.map((item) => (
                  <div key={`${item.type}-${item.title}`} className="analytics-note-card analytics-note-card--action">
                    <div className="analytics-note-head">
                      <strong>{item.title}</strong>
                      <span>{item.action_type}</span>
                    </div>
                    <p>{item.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-empty">No immediate actions generated.</div>
            )}
            {priorityRisks.length ? (
              <div className="analytics-list">
                {priorityRisks.map((item) => (
                  <div key={`${item.type}-${item.title}`} className="analytics-note-card">
                    <div className="analytics-note-head">
                      <strong>{item.title}</strong>
                      <span>{item.severity}</span>
                    </div>
                    <p>{item.reason}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </WidgetPanel>

        <WidgetPanel title="Data Quality" subtitle="System Data • explicit confidence, exclusions, and backfill state">
          <div className="analytics-stack">
            <PairTable
              rows={asRows([
                ["Overall Confidence", toConfidence(summary?.confidence?.overall)],
                ["Cost Data Status", summary?.cost_summary?.status || "missing"],
                ["Planning Status", summary?.planning?.status || "incomplete"],
                ["Model", model.replaceAll("_", " ") || "—"],
              ])}
            />
            {dataQualityMessages.length ? (
              <div className="analytics-list">
                {dataQualityMessages.slice(0, 6).map((item) => (
                  <div key={item} className="analytics-note-card analytics-note-card--plain">
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-empty">No active data quality alerts.</div>
            )}
          </div>
        </WidgetPanel>
      </div>

      <div className="analytics-two-col">
        <WidgetPanel title="System Data" subtitle="Revenue, collections, and contract truth">
          <PairTable rows={financialRows} />
        </WidgetPanel>

        <WidgetPanel title="Profit + Cost" subtitle="Hide when cost inputs are incomplete">
          <div className="analytics-stack">
            <PairTable rows={profitRows} emptyLabel="Cost data not configured enough to compute trusted margin." />
            <PairTable rows={costRows} emptyLabel="No cost configuration yet." />
            {costMessages.length ? (
              <div className="analytics-list">
                {costMessages.map((item) => (
                  <div key={item} className="analytics-note-card analytics-note-card--plain">
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </WidgetPanel>
      </div>

      <div className="analytics-two-col">
        <WidgetPanel title="Planning Engine" subtitle="System Data • saved scenarios with explicit formulas">
          <div className="analytics-stack">
            <PairTable rows={planningRows} emptyLabel="Planning inputs are incomplete." />
            {summary?.planning?.status === "incomplete" && missingPlanningInputs.length ? (
              <div className="analytics-warn analytics-warn--info">
                Missing inputs: {missingPlanningInputs.map(planningFieldLabel).join(", ")}
              </div>
            ) : null}
            {invalidPlanningFields.length ? (
              <div className="analytics-warn">
                Invalid inputs: {invalidPlanningFields.map(planningFieldLabel).join(", ")}
              </div>
            ) : null}
            <div className="analytics-mini-form">
              <div className="analytics-form-row">
                <label>Scenario</label>
                <select
                  value={selectedScenarioId}
                  onChange={(event) => {
                    const next = scenarios.find((item) => String(item.id) === String(event.target.value)) || null;
                    setSelectedScenarioId(event.target.value);
                    setScenarioForm(scenarioToForm(next));
                  }}
                >
                  <option value="">New scenario</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="analytics-form-grid">
                <label>
                  Name
                  <input
                    value={scenarioForm.name}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={scenarioForm.scenario_type}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, scenario_type: event.target.value }))}
                  >
                    <option value="baseline">Baseline</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="conservative">Conservative</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className={highlightedPlanningFields.has("target_annual_revenue") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Target Annual Revenue
                  <input
                    className={highlightedPlanningFields.has("target_annual_revenue") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.target_annual_revenue}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, target_annual_revenue: event.target.value }))}
                  />
                </label>
                <label className={highlightedPlanningFields.has("average_job_value") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Average Job Value
                  <input
                    className={highlightedPlanningFields.has("average_job_value") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.average_job_value}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, average_job_value: event.target.value }))}
                  />
                </label>
                <label className={highlightedPlanningFields.has("close_rate") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Close Rate
                  <input
                    className={highlightedPlanningFields.has("close_rate") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.close_rate}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, close_rate: event.target.value }))}
                  />
                </label>
                <label className={highlightedPlanningFields.has("lead_to_quote_rate") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Lead → Quote Rate
                  <input
                    className={highlightedPlanningFields.has("lead_to_quote_rate") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.lead_to_quote_rate}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, lead_to_quote_rate: event.target.value }))}
                  />
                </label>
                <label className={highlightedPlanningFields.has("technician_capacity") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Technician Capacity
                  <input
                    className={highlightedPlanningFields.has("technician_capacity") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.technician_capacity}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, technician_capacity: event.target.value }))}
                  />
                </label>
                <label className={highlightedPlanningFields.has("sales_capacity") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Sales Capacity
                  <input
                    className={highlightedPlanningFields.has("sales_capacity") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.sales_capacity}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, sales_capacity: event.target.value }))}
                  />
                </label>
                <label className={highlightedPlanningFields.has("cac_by_channel.google") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Google CAC
                  <input
                    className={highlightedPlanningFields.has("cac_by_channel.google") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.cac_by_channel.google}
                    onChange={(event) =>
                      setScenarioForm((prev) => ({
                        ...prev,
                        cac_by_channel: { ...prev.cac_by_channel, google: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className={highlightedPlanningFields.has("cac_by_channel.meta") ? "analytics-field analytics-field--warn" : "analytics-field"}>
                  Meta CAC
                  <input
                    className={highlightedPlanningFields.has("cac_by_channel.meta") ? "analytics-input analytics-input--warn" : "analytics-input"}
                    value={scenarioForm.cac_by_channel.meta}
                    onChange={(event) =>
                      setScenarioForm((prev) => ({
                        ...prev,
                        cac_by_channel: { ...prev.cac_by_channel, meta: event.target.value },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="analytics-button-row">
                <button
                  type="button"
                  className="analytics-btn"
                  disabled={saving || invalidPlanningFields.length > 0}
                  onClick={handleSaveScenario}
                >
                  Save Scenario
                </button>
                <button
                  type="button"
                  className="analytics-btn analytics-btn--ghost"
                  disabled={saving || !selectedScenarioId}
                  onClick={handleDeleteScenario}
                >
                  Delete
                </button>
                <label className="analytics-check">
                  <input
                    type="checkbox"
                    checked={scenarioForm.is_default}
                    onChange={(event) => setScenarioForm((prev) => ({ ...prev, is_default: event.target.checked }))}
                  />
                  Default scenario
                </label>
              </div>
            </div>
          </div>
        </WidgetPanel>

        <WidgetPanel title="Cost Configuration" subtitle="System Data • manual inputs when live cost feeds are incomplete">
          <div className="analytics-mini-form">
            {costAnalysis.invalidFields.length ? (
              <div className="analytics-warn">
                Invalid inputs: {costAnalysis.invalidFields.map(planningFieldLabel).join(", ")}
              </div>
            ) : null}
            <div className="analytics-form-grid">
              {[
                ["fixed_overhead_monthly", "Fixed Overhead"],
                ["marketing_monthly", "Marketing"],
                ["payroll_monthly", "Payroll"],
                ["fuel_monthly", "Fuel"],
                ["materials_monthly", "Materials"],
                ["software_monthly", "Software"],
              ].map(([key, label]) => (
                <label key={key} className="analytics-field">
                  {label}
                  <input
                    className="analytics-input"
                    value={costForm[key] ?? ""}
                    onChange={(event) => setCostForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
            <label>
              Notes
              <textarea
                rows="3"
                value={costForm.notes || ""}
                onChange={(event) => setCostForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <div className="analytics-button-row">
              <button
                type="button"
                className="analytics-btn"
                disabled={saving || costAnalysis.invalidFields.length > 0}
                onClick={handleSaveCostConfiguration}
              >
                Save Cost Inputs
              </button>
            </div>
          </div>
        </WidgetPanel>
      </div>

      <div className="analytics-two-col">
        <WidgetPanel title="Revenue Owners" subtitle="System Data • mapped people first, fallback buckets explicit">
          {!ownerLeaderboard.length ? (
            <div className="analytics-empty">No owner rows yet.</div>
          ) : (
            <div className="analytics-table">
              <div className="analytics-table-head analytics-table-head--owners">
                <span>Owner</span>
                <span>Booked</span>
                <span>Collected</span>
                <span>Quotes</span>
                <span>Conversion</span>
              </div>
              {ownerLeaderboard.map((row) => (
                <div key={`${row.owner_id || row.owner_name}`} className="analytics-table-row analytics-table-row--owners">
                  <strong>{row.owner_name}</strong>
                  <span>{toMoney(row.booked_revenue)}</span>
                  <span>{toMoney(row.collected_revenue)}</span>
                  <span>{toNumber(row.quote_count)}</span>
                  <span>{toPercent(row.conversion_rate)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="analytics-kpi-subtle">
            Unmapped external reps stay visible until team members set their external rep id in Team settings.
          </div>
        </WidgetPanel>

        <WidgetPanel title="Forecast + Trend" subtitle="System Data • date filter propagates to trend widgets">
          <div className="analytics-stack">
            <PairTable rows={forecastRows} />
            <PairTable
              rows={asRows([
                ["Daily Rows", toNumber(daily.length)],
                ["Monthly Rows", toNumber(monthly.length)],
                ["Trend Window", `${presetDays} days`],
              ])}
            />
          </div>
        </WidgetPanel>
      </div>

      <div className="analytics-two-col">
        <WidgetPanel title="Executable Drilldowns" subtitle="System Data • every important number should resolve to real records">
          <div className="analytics-button-grid">
            {[
              ["paused_mrr", "Paused MRR"],
              ["orphan_quote_count", "Orphan Quotes"],
              ["unattributed_booked_revenue", "Unattributed Revenue"],
              ["high_value_stuck_quote", "Stuck Quotes"],
            ].map(([key, label]) => (
              <button key={key} type="button" className="analytics-btn analytics-btn--ghost" onClick={() => handleOpenMetric(key)}>
                {label}
              </button>
            ))}
          </div>
          {drilldown?.records?.length ? (
            <div className="analytics-stack">
              <div className="analytics-note-card analytics-note-card--plain">
                <div className="analytics-note-head">
                  <strong>{drilldown.title}</strong>
                  <span>{drilldown.count} records</span>
                </div>
              </div>
              <div className="analytics-list">
                {drilldown.records.slice(0, 12).map((row) => (
                  <a key={`${row.entity_type}-${row.entity_id}`} className="analytics-record-card" href={row.route?.web_path || "#"}>
                    <strong>{row.label}</strong>
                    <span>{row.subtitle}</span>
                    <em>{row.reason}</em>
                  </a>
                ))}
              </div>
              <div className="analytics-button-row">
                <button type="button" className="analytics-btn" onClick={() => handleSaveAudience(drilldown)} disabled={saving}>
                  Save as Audience
                </button>
                <button type="button" className="analytics-btn" onClick={() => handleCreateCampaignDraft(drilldown)} disabled={saving}>
                  Create Campaign Draft
                </button>
                <button type="button" className="analytics-btn analytics-btn--ghost" onClick={() => handleAssignFollowUp(drilldown)} disabled={saving}>
                  Assign Follow-up
                </button>
              </div>
            </div>
          ) : (
            <div className="analytics-empty">Open a metric to see the affected records and available actions.</div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Smart Query" subtitle="AI Insight • natural language mapped to real CRM records only">
          <div className="analytics-mini-form">
            <div className="analytics-form-inline">
              <input
                value={smartQuery}
                placeholder="customers with recurring issues and open quotes"
                onChange={(event) => setSmartQuery(event.target.value)}
              />
              <button type="button" className="analytics-btn" onClick={handleRunSmartQuery} disabled={smartLoading}>
                {smartLoading ? "Running…" : "Run"}
              </button>
            </div>
            {smartResults?.results?.length ? (
              <div className="analytics-stack">
                <div className="analytics-list">
                  {smartResults.results.slice(0, 12).map((row) => (
                    <a key={`${row.entity_type}-${row.entity_id}`} className="analytics-record-card" href={row.route?.web_path || "#"}>
                      <strong>{row.label}</strong>
                      <span>{row.subtitle}</span>
                      <em>{row.reason || "Matched smart query"}</em>
                    </a>
                  ))}
                </div>
                <div className="analytics-button-row">
                  <button type="button" className="analytics-btn" onClick={() => handleSaveAudience(smartResults)} disabled={saving}>
                    Save as Audience
                  </button>
                  <button type="button" className="analytics-btn" onClick={() => handleCreateCampaignDraft(smartResults)} disabled={saving}>
                    Create Campaign Draft
                  </button>
                </div>
              </div>
            ) : (
              <div className="analytics-empty">
                {smartResults?.explanations?.[0] || "Use natural language to open real customer, lead, quote, or paused-account result sets."}
              </div>
            )}
          </div>
        </WidgetPanel>
      </div>

      <div className="analytics-two-col">
        <WidgetPanel title="AI Insight" subtitle="Anomalies and typed recommendations">
          {!anomalies.length ? (
            <div className="analytics-empty">No anomalies detected.</div>
          ) : (
            <div className="analytics-list">
              {anomalies.map((item) => (
                <div key={`${item.type}-${item.title}`} className="analytics-note-card">
                  <div className="analytics-note-head">
                    <strong>{item.title}</strong>
                    <span>{item.severity}</span>
                  </div>
                  <p>{item.reason}</p>
                </div>
              ))}
            </div>
          )}
        </WidgetPanel>

        <WidgetPanel title="Exclusions" subtitle="System Data • incomplete or backfilling data stays explicit">
          {!exclusions.length ? (
            <div className="analytics-empty">No exclusions reported.</div>
          ) : (
            <div className="analytics-list">
              {exclusions.slice(0, 12).map((item) => (
                <div key={item} className="analytics-note-card analytics-note-card--plain">
                  <p>{item}</p>
                </div>
              ))}
            </div>
          )}
        </WidgetPanel>
      </div>
    </div>
  );
}
