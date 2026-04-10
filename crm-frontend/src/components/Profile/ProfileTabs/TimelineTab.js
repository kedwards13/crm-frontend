import React, { useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";

const toRows = (value) =>
  Array.isArray(value)
    ? value
    : Array.isArray(value?.results)
    ? value.results
    : Array.isArray(value?.messages)
    ? value.messages
    : Array.isArray(value?.calls)
    ? value.calls
    : Array.isArray(value?.items)
    ? value.items
    : [];

const clean = (value) => String(value || "").trim();

const toDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIso = (value) => {
  const date = toDate(value);
  return date ? date.toISOString() : null;
};

const formatTime = (value) => {
  const date = toDate(value);
  if (!date) return "Unknown time";
  return date.toLocaleString();
};

const buildThreadParams = (record) => {
  const params = {};
  const partyId = record?.universal_id || record?.raw?.universal_id;
  if (partyId) params.party_universal_id = partyId;
  if (record?.object === "lead" && record?.id) params.lead_id = record.id;
  if (record?.object === "customer" && record?.raw?.id) params.customer_id = record.raw.id;
  return params;
};

const matchesRecord = (row, record, params) => {
  if (!row || !record) return false;
  const partyId = clean(params.party_universal_id);
  if (partyId && clean(row.party_universal_id) === partyId) return true;

  if (record.object === "lead") {
    const leadId = clean(record.id || record.raw?.id);
    if (leadId && clean(row.lead) === leadId) return true;
  }

  if (record.object === "customer") {
    const customerPk = clean(record.raw?.id);
    const customerUuid = clean(record.id || record.raw?.customer_id);
    if (customerPk && clean(row.customer) === customerPk) return true;
    if (customerUuid && clean(row.customer_id) === customerUuid) return true;
  }

  return false;
};

export default function TimelineTab({ record }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let mounted = true;
    const params = buildThreadParams(record);

    const load = async () => {
      setLoading(true);
      const [
        messagesRaw,
        callsRaw,
        appointmentsRaw,
        paymentsRaw,
        campaignPerformanceRaw,
      ] = await Promise.all([
        api
          .get("/comms/thread/", { params })
          .then((res) => toRows(res.data))
          .catch(() => []),
        api
          .get("/comms/calls/", { params })
          .then((res) => toRows(res.data))
          .catch(() => []),
        api
          .get("/appointments/appointments/")
          .then((res) => toRows(res.data))
          .catch(() => []),
        api
          .get("/payments/")
          .then((res) => toRows(res.data))
          .catch(() => []),
        api
          .get("/campaigns/performance/")
          .then((res) => res.data || null)
          .catch(() => null),
      ]);

      if (!mounted) return;

      const timelineRows = [];

      messagesRaw.forEach((msg) => {
        const timestamp =
          toIso(msg.created_at) || toIso(msg.timestamp) || toIso(msg.updated_at);
        if (!timestamp) return;
        const direction =
          clean(msg.direction).toLowerCase() === "inbound" ? "Received" : "Sent";
        const channel = clean(msg.channel || "sms").toUpperCase();
        timelineRows.push({
          id: `msg-${msg.id || timestamp}`,
          kind: "communication",
          timestamp,
          title: `${channel} ${direction}`,
          detail: clean(msg.body || msg.preview || msg.body_html || "(empty message)"),
          status: clean(msg.delivery_status || msg.status || ""),
        });
      });

      callsRaw.forEach((call) => {
        const timestamp =
          toIso(call.created_at) || toIso(call.started_at) || toIso(call.timestamp);
        if (!timestamp) return;
        timelineRows.push({
          id: `call-${call.call_sid || call.id || timestamp}`,
          kind: "call",
          timestamp,
          title: "Call Activity",
          detail: `${clean(call.from_number || "")} → ${clean(call.to_number || "")}`.trim(),
          status: clean(call.outcome || call.status || ""),
        });
      });

      appointmentsRaw
        .filter((appt) => matchesRecord(appt, record, params))
        .forEach((appt) => {
          const timestamp =
            toIso(appt.start_time) || toIso(appt.created_at) || toIso(appt.updated_at);
          if (!timestamp) return;
          timelineRows.push({
            id: `appt-${appt.id || timestamp}`,
            kind: "appointment",
            timestamp,
            title: "Appointment",
            detail: clean(appt.notes || appt.service_type || "Scheduled service visit"),
            status: clean(appt.status || ""),
          });
        });

      const candidateCustomerIds = new Set(
        [
          record?.id,
          record?.raw?.id,
          record?.raw?.customer_id,
          record?.raw?.customer_external_id,
          record?.raw?.external_id,
        ]
          .map((value) => clean(value))
          .filter(Boolean)
      );

      paymentsRaw.forEach((payment) => {
        const paymentCustomerId = clean(
          payment.customer_external_id || payment.customer_id || payment.customer
        );
        if (candidateCustomerIds.size && paymentCustomerId && !candidateCustomerIds.has(paymentCustomerId)) {
          return;
        }
        const timestamp = toIso(payment.date) || toIso(payment.created_at);
        if (!timestamp) return;
        const amount = Number(payment.amount || 0);
        timelineRows.push({
          id: `pay-${payment.external_id || payment.invoice_id || timestamp}`,
          kind: "payment",
          timestamp,
          title: "Payment",
          detail: Number.isFinite(amount) ? `$${amount.toFixed(2)} received` : "Payment recorded",
          status: clean(payment.status || ""),
        });
      });

      const campaignSummary = campaignPerformanceRaw?.summary || null;
      if (campaignSummary) {
        timelineRows.push({
          id: "campaign-summary",
          kind: "campaign",
          timestamp: new Date().toISOString(),
          title: "Campaign Snapshot",
          detail: `Sent ${campaignSummary.sent || 0}, replies ${campaignSummary.replied || 0}`,
          status: campaignSummary.reply_rate != null ? `reply rate ${campaignSummary.reply_rate}` : "",
        });
      }

      const noteValue =
        clean(record?.raw?.access_notes) ||
        clean(record?.raw?.followup_notes) ||
        clean(record?.raw?.extended_fields?.notes);
      if (noteValue) {
        timelineRows.push({
          id: "customer-note",
          kind: "note",
          timestamp: toIso(record?.raw?.updated_at) || new Date().toISOString(),
          title: "Customer Note",
          detail: noteValue,
          status: "",
        });
      }

      timelineRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEvents(timelineRows);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [record]);

  const grouped = useMemo(() => events, [events]);

  if (loading) {
    return <div style={{ padding: 16, color: "var(--text-muted)" }}>Loading timeline...</div>;
  }

  if (!grouped.length) {
    return (
      <div style={{ padding: 16 }}>
        No timeline events are available from current API endpoints for this record.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {grouped.map((event) => (
        <div
          key={event.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 12,
            background: "var(--bg-card)",
            color: "var(--text-main)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong>{event.title}</strong>
            <span style={{ color: "var(--text-sub)", fontSize: 12 }}>{formatTime(event.timestamp)}</span>
          </div>
          <div style={{ marginTop: 6 }}>{event.detail || "No details"}</div>
          {event.status ? (
            <div style={{ marginTop: 6, color: "var(--text-sub)", fontSize: 12 }}>
              Status: {event.status}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
