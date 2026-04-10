import React, { useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const clean = (value) => String(value || "").trim();

const formatDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

const matchesCustomer = (row, record) => {
  const customerPk = clean(record?.raw?.id);
  const customerUuid = clean(record?.id || record?.raw?.customer_id);
  if (customerPk && clean(row.customer) === customerPk) return true;
  if (customerUuid && clean(row.customer_id) === customerUuid) return true;
  return false;
};

export default function WorkOrdersTab({ record }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const list = await api
        .get("/scheduling/work-orders/")
        .then((res) => toRows(res.data))
        .catch(() => []);
      if (!mounted) return;
      setRows(list);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [record]);

  const filtered = useMemo(() => {
    if (!record || record.object !== "customer") return [];
    return rows
      .filter((row) => matchesCustomer(row, record))
      .sort(
        (a, b) =>
          new Date(b.created_at || b.updated_at || 0) -
          new Date(a.created_at || a.updated_at || 0)
      );
  }, [rows, record]);

  if (loading) {
    return <div style={{ padding: 16 }}>Loading work orders...</div>;
  }

  if (record?.object !== "customer") {
    return (
      <div style={{ padding: 16 }}>
        Work orders are linked to customer records. Convert this lead to a customer to view work
        order history.
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div style={{ padding: 16 }}>
        No linked work orders were found for this customer from `/api/scheduling/work-orders/`.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {filtered.map((row) => (
        <div
          key={row.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 12,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{clean(row.title) || `Work Order #${row.id}`}</strong>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{clean(row.status) || "open"}</span>
          </div>
          <div style={{ marginTop: 6, color: "#374151" }}>
            {clean(row.notes) || clean(row.description) || "No notes provided."}
          </div>
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
            Updated: {formatDate(row.updated_at || row.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}
