import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../../utils/formatters";
import revivalApi from "../../../api/revivalApi";
import "./revival-tab.css";

/* Normalize phone numbers */
function normalizePhone(phone) {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

export default function RevivalTab({ customer }) {
  const API_BASE = process.env.REACT_APP_API_BASE || "https://os.abon.ai";
  const navigate = useNavigate();

  const goCreateQuote = () => {
    navigate("/quotes/create", {
      state: {
        customer: {
          id: customer?.customer_id || customer?.id,
          customer_id: customer?.customer_id || customer?.id,
          first_name: customer?.first_name || "",
          last_name: customer?.last_name || "",
          full_name:
            customer?.full_name ||
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" "),
          company_name: customer?.company_name || "",
          primary_phone: customer?.primary_phone || customer?.phone || "",
          primary_email: customer?.primary_email || customer?.email || "",
          service_type: customer?.service_type || customer?.service || "",
        },
      },
    });
  };

  const [quotes, setQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function loadQuotes() {
      try {
        /* -----------------------------
           Customer Identifiers
        ------------------------------*/
        const cid =
          customer?.customer_id ||
          customer?.id ||
          customer?.raw?.customer_id ||
          customer?.raw?.id ||
          null;
        const cuid = customer?.universal_id || customer?.raw?.universal_id || null;

        const phoneNorm = normalizePhone(
          customer?.primary_phone ||
            customer?.phone ||
            customer?.raw?.primary_phone ||
            customer?.raw?.phone
        );
        const email =
          customer?.primary_email ||
          customer?.email ||
          customer?.raw?.primary_email ||
          customer?.raw?.email;

        const params = {};
        if (cid) params.customer_id = String(cid);
        if (cuid) params.party_universal_id = String(cuid);
        if (phoneNorm) params.contact_phone = phoneNorm;
        if (email) params.contact_email = email;

        let res = await revivalApi.listQuotes(params);
        let raw = res.data;

        let all = [];
        if (Array.isArray(raw)) all = raw;
        else if (Array.isArray(raw?.results)) all = raw.results;
        else if (Array.isArray(raw?.data)) all = raw.data;
        else if (Array.isArray(raw?.quotes)) all = raw.quotes;

        if (!all.length && Object.keys(params).length > 0) {
          // Compatibility fallback for tenants still returning broad quote lists.
          res = await revivalApi.listQuotes();
          raw = res.data;
          if (Array.isArray(raw)) all = raw;
          else if (Array.isArray(raw?.results)) all = raw.results;
          else if (Array.isArray(raw?.data)) all = raw.data;
          else if (Array.isArray(raw?.quotes)) all = raw.quotes;
        }

        console.log("🔥 Revival list loaded:", all.length);
        console.log("🔥 Quotes:", all);
        console.log("🔥 Customer:", customer);

        // Show all if opened directly from a quote
        if (customer?.object === "revival") {
          setQuotes(all);
          setLoadingQuotes(false);
          return;
        }

        /* -----------------------------
           CORRECT FILTER (FINAL)
        ------------------------------*/
        let filtered = all.filter((q) => {
          const qCid =
            q.customer_external_id ||
            q.customer_id ||
            q.customer_pk ||
            q.customer?.customer_id ||
            q.customer?.id ||
            q.customer ||
            null;
          const qUid = q.customer_universal_id || null;

          const qPhone = normalizePhone(
            q.customer_phone || q.customer?.primary_phone || q.customer?.phone
          );
          const qEmail = q.customer_email || q.customer?.primary_email || q.customer?.email;

          return (
            // ID match
            (cid && qCid && String(qCid) === String(cid)) ||

            // Universal ID match
            (cuid && qUid && String(qUid) === String(cuid)) ||

            // Phone match
            (phoneNorm && qPhone && qPhone === phoneNorm) ||

            // Email match
            (email &&
              qEmail &&
              qEmail.toLowerCase() === email.toLowerCase())
          );
        });

        /* -----------------------------
           Fallback by name
        ------------------------------*/
        if (!filtered.length) {
          const clean = (v) => String(v || "").trim().toLowerCase();
          const name = clean(customer?.full_name);
          filtered = all.filter((q) => clean(q.customer_name) === name);
        }

        console.log("🔥 Filtered:", filtered.length, filtered);

        setQuotes(filtered);
      } catch (err) {
        console.error("Error loading quotes:", err);
      } finally {
        setLoadingQuotes(false);
      }
    }

    if (customer) loadQuotes();
  }, [customer]);

  /* -----------------------------
       Loading / Empty States
  ------------------------------*/
  if (loadingQuotes) {
    return <div className="p-4 text-gray-400 text-sm">Loading quotes…</div>;
  }

  if (!quotes.length) {
    return (
      <div className="p-6 text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
          No quotes found for this contact yet.
        </p>
        <button
          type="button"
          onClick={goCreateQuote}
          style={{
            background: "var(--color-accent, #2563eb)",
            color: "#ffffff",
            border: 0,
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          + Create First Quote
        </button>
      </div>
    );
  }

  /* -----------------------------
       ACTION HANDLERS
  ------------------------------*/
  const viewDetails = (quote) => {
    window.open(`/quotes/${quote.id}`, "_blank");
  };

  const sendQuoteAgain = async (quote) => {
    setLoadingAction(quote.id);
  
    try {
      console.log("QUOTE:", quote);
  
      const phone =
        quote.customer_phone ||
        quote.customer?.primary_phone ||
        quote.customer?.phone;
  
      if (!phone) {
        alert("No customer phone available.");
        return;
      }
  
      await fetch(`${API_BASE}/revival/${quote.id}/send-again/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ phone }),
      });
  
      alert("Quote sent via SMS/MMS.");
    } catch (err) {
      console.error(err);
      alert("Could not send quote.");
    } finally {
      setLoadingAction(null);
    }
  };

  const exportPDF = async (quote) => {
    setLoadingAction(quote.id);
    try {
      const res = await fetch(
        `${API_BASE}/revival/${quote.id}/export-pdf/`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `quote-${quote.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Could not export PDF.");
    } finally {
      setLoadingAction(null);
    }
  };

  const updateStatus = async (quote, newStatus) => {
    setLoadingAction(quote.id);

    try {
      await revivalApi.updateQuote(quote.id, {
        ...quote,
        status: newStatus,
      });

      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quote.id ? { ...q, status: newStatus } : q
        )
      );
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Could not update status.");
    } finally {
      setLoadingAction(null);
    }
  };

  /* -----------------------------
       Colors
  ------------------------------*/
  const STATUS_COLORS = {
    draft: "#6B7280",
    sent: "#3b82f6",
    accepted: "#22c55e",
    rejected: "#ef4444",
    converted: "#06b6d4",
    active: "#0284c7",
    completed: "#8b5cf6",
    renewal_due: "#f59e0b",
  };

  /* -----------------------------
       RENDER
  ------------------------------*/
  return (
    <div className="revival-tab p-4 space-y-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
          {quotes.length} quote{quotes.length === 1 ? "" : "s"} on file
        </p>
        <button
          type="button"
          onClick={goCreateQuote}
          style={{
            background: "var(--color-accent, #2563eb)",
            color: "#ffffff",
            border: 0,
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + New Quote
        </button>
      </div>
      {quotes.map((q) => {
        const isExpanded = expanded === q.id;

        return (
          <div key={q.id} className="revival-quote-card">

            {/* HEADER */}
            <div
              className="quote-header-bar"
              style={{ background: STATUS_COLORS[q.status] }}
            >
              <div className="qh-status">{q.status?.toUpperCase()}</div>
              <div className="qh-total">
                TOTAL:
                <span className="qh-total-value">
                  {formatCurrency(q.total || q.estimated_total || 0)}
                </span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="quote-header-actions">
              <button
                className="qh-btn blue"
                disabled={loadingAction === q.id}
                onClick={() => viewDetails(q)}
              >
                View PDF
              </button>

              <button
                className="qh-btn green"
                disabled={loadingAction === q.id}
                onClick={() => sendQuoteAgain(q)}
              >
                Send Again
              </button>

              <button
                className="qh-btn amber"
                disabled={loadingAction === q.id}
                onClick={() => exportPDF(q)}
              >
                Export PDF
              </button>
            </div>

            {/* DETAILS */}
            <div className="details">
              <div>
                <strong>Date:</strong>{" "}
                {q.created_at
                  ? new Date(q.created_at).toLocaleDateString()
                  : "—"}
              </div>
              <div>
                <strong>Description:</strong>{" "}
                {q.description || q.title || "—"}
              </div>
              <div>
                <strong>Service:</strong> {q.service_type || "—"}
              </div>
            </div>

            {/* ITEMS */}
            {q.items?.length > 0 && (
              <>
                <div className="expand-toggle">
                  <button onClick={() => setExpanded(isExpanded ? null : q.id)}>
                    {isExpanded ? "Hide Items" : "Show Items"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="line-items">
                    {q.items.map((item) => (
                      <div key={item.id} className="line-item">
                        <div className="li-desc">{item.description}</div>
                        <div className="li-meta">
                          {item.quantity} × {formatCurrency(item.unit_price)} ={" "}
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* STATUS PANEL */}
            <div className="status-panel">
              {Object.keys(STATUS_COLORS).map((s) => (
                <button
                  key={s}
                  className={`status-btn ${q.status === s ? "active" : ""}`}
                  disabled={loadingAction === q.id}
                  onClick={() => updateStatus(q, s)}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

          </div>
        );
      })}
    </div>
  );
}
