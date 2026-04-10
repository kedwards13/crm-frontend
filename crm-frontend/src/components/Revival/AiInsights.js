import React, { useEffect, useMemo, useState } from "react";
import api from "../../apiClient";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const clean = (value) => String(value || "").trim();

const money = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : "—";
};

const normalizeType = (value) => {
  const raw = clean(value).toLowerCase();
  if (raw.includes("react")) return "reactivation";
  if (raw.includes("upsell")) return "upsell";
  if (raw.includes("payment")) return "payment_recovery";
  if (raw.includes("service")) return "service_gap";
  return "reactivation";
};

const GROUP_ORDER = [
  "reactivation",
  "upsell",
  "payment_recovery",
  "service_gap",
];

export default function AiInsights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [runningAction, setRunningAction] = useState("");

  const grouped = useMemo(() => {
    const map = {
      reactivation: [],
      upsell: [],
      payment_recovery: [],
      service_gap: [],
    };

    opportunities.forEach((item) => {
      const key = normalizeType(item.type || item.opportunity_type);
      map[key].push(item);
    });
    return map;
  }, [opportunities]);

  const load = async () => {
    setLoading(true);
    const [insightsData, opportunitiesData] = await Promise.all([
      api
        .get("/revenue-insights/")
        .then((res) => res.data || null)
        .catch(() => null),
      api
        .get("/opportunities/")
        .then((res) => toRows(res.data))
        .catch(() => []),
    ]);
    setInsights(insightsData);
    setOpportunities(opportunitiesData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sendSms = async (item) => {
    const customerId = item.customer_id || item.customer?.id;
    if (!customerId) return;
    setRunningAction(`sms-${item.id}`);
    try {
      await api.post("/comms/send/", {
        customer_id: customerId,
        channel: "sms",
        body:
          clean(item.recommended_action) ||
          "Hi! We have an update related to your service account. Reply here for help.",
      });
    } finally {
      setRunningAction("");
    }
  };

  const createTask = async (item) => {
    const leadId = item.lead_id || item.lead?.id;
    if (!leadId) return;
    setRunningAction(`task-${item.id}`);
    try {
      await api.post("/tasks/", {
        lead: leadId,
        title: "Revenue opportunity follow-up",
        description: clean(item.recommended_action) || "Review and action this opportunity.",
        task_type: "follow_up",
        status: "pending",
      });
    } finally {
      setRunningAction("");
    }
  };

  const openCustomer = (item) => {
    const customerId = item.customer_id || item.customer?.id || item.customer_external_id;
    if (!customerId) return;
    window.location.href = `/customers/list?search=${encodeURIComponent(String(customerId))}`;
  };

  const scheduleAppointment = () => {
    window.location.href = "/schedule/day";
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading AI insights...</div>;
  }

  return (
    <div style={{ padding: 20, display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Revenue Intelligence</h3>
        <div style={{ color: "#374151" }}>
          Estimated Recovery: {money(insights?.estimated_revenue_recovery)}
        </div>
        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Opportunities: {insights?.total_opportunities || opportunities.length}
        </div>
      </section>

      {GROUP_ORDER.map((group) => (
        <section key={group}>
          <h4 style={{ margin: "0 0 10px 0", textTransform: "capitalize" }}>
            {group.replace("_", " ")}
          </h4>
          {!grouped[group].length ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>No items in this category.</div>
          ) : (
            grouped[group].map((item) => (
              <div
                key={`${group}-${item.id}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{clean(item.source) || "Opportunity"}</strong>
                  <span>{money(item.estimated_value)}</span>
                </div>
                <div style={{ marginTop: 6, color: "#374151" }}>
                  {clean(item.recommended_action) || "No recommended action supplied."}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                  Priority: {clean(item.priority_score) || "0"} • Status: {clean(item.status) || "open"}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => sendSms(item)}
                    disabled={runningAction === `sms-${item.id}` || !item.customer_id}
                  >
                    Send SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => createTask(item)}
                    disabled={runningAction === `task-${item.id}` || !item.lead_id}
                  >
                    Create Task
                  </button>
                  <button type="button" onClick={scheduleAppointment}>
                    Schedule Appointment
                  </button>
                  <button type="button" onClick={() => openCustomer(item)} disabled={!item.customer_id && !item.customer_external_id}>
                    Open Customer
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      ))}
    </div>
  );
}
