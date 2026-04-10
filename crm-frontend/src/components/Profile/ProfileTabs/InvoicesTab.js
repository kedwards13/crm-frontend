import React, { useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";
import "../../Customers/CustomerDetailPage.css";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const clean = (value) => String(value || "").trim();

const money = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toFixed(2)}`;
};

const formatDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
};

export default function InvoicesTab({ record }) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [invoiceRows, paymentRows] = await Promise.all([
        api
          .get("/invoices/")
          .then((res) => toRows(res.data))
          .catch(() => []),
        api
          .get("/payments/")
          .then((res) => toRows(res.data))
          .catch(() => []),
      ]);

      if (!mounted) return;
      setInvoices(invoiceRows);
      setPayments(paymentRows);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [record]);

  const candidateIds = useMemo(
    () =>
      new Set(
        [
          record?.id,
          record?.raw?.id,
          record?.raw?.customer_id,
          record?.raw?.external_id,
          record?.raw?.customer_external_id,
        ]
          .map((value) => clean(value))
          .filter(Boolean)
      ),
    [record]
  );

  const filteredInvoices = useMemo(() => {
    if (!candidateIds.size) return [];
    return invoices.filter((row) => candidateIds.has(clean(row.customer_id)));
  }, [invoices, candidateIds]);

  const filteredPayments = useMemo(() => {
    if (!candidateIds.size) return [];
    return payments.filter((row) =>
      candidateIds.has(clean(row.customer_external_id || row.customer_id))
    );
  }, [payments, candidateIds]);

  if (loading) {
    return <div className="cdp-empty">Loading invoice and payment history...</div>;
  }

  return (
    <div className="cdp-stack">
      <section className="cdp-group">
        <div className="cdp-group-head">
          <h4>Invoices</h4>
          <span>{filteredInvoices.length}</span>
        </div>
        {!filteredInvoices.length ? (
          <div className="cdp-empty">No linked invoices found.</div>
        ) : (
          filteredInvoices.map((row) => (
            <article
              key={row.external_id || row.invoice_number}
              className="cdp-item-card"
            >
              <div className="cdp-item-row">
                <strong>{clean(row.invoice_number) || clean(row.external_id) || "Invoice"}</strong>
                <span>{money(row.total)}</span>
              </div>
              <div className="cdp-item-meta">
                Date: {formatDate(row.invoice_date)} • Balance: {money(row.balance)}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="cdp-group">
        <div className="cdp-group-head">
          <h4>Payments</h4>
          <span>{filteredPayments.length}</span>
        </div>
        {!filteredPayments.length ? (
          <div className="cdp-empty">No linked payments found.</div>
        ) : (
          filteredPayments.map((row) => (
            <article
              key={row.external_id || `${row.invoice_id}-${row.date}`}
              className="cdp-item-card"
            >
              <div className="cdp-item-row">
                <strong>Payment {clean(row.invoice_id) ? `for ${row.invoice_id}` : ""}</strong>
                <span>{money(row.amount)}</span>
              </div>
              <div className="cdp-item-meta">
                Date: {formatDate(row.date)} • Method: {clean(row.payment_method) || "Unknown"} •
                Status: {clean(row.status) || "Unknown"}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
