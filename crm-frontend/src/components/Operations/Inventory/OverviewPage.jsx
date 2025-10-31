import React, { useEffect, useState } from "react";
import useInventoryApi from "./useInventoryApi";

export default function OverviewPage() {
  const { lowStock, consumption, reorderSuggestions, quickReorder } = useInventoryApi();
  const [alerts, setAlerts] = useState([]);
  const [suggest, setSuggest] = useState([]);
  const [month, setMonth] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, s, c] = await Promise.all([
          lowStock().catch(() => []),
          reorderSuggestions().catch(() => []),
          consumption({ range: "last_30d" }).catch(() => []),
        ]);
        setAlerts(Array.isArray(a) ? a : (a.items || a || []));
        setSuggest(Array.isArray(s) ? s : (s.items || s || []));
        setMonth(Array.isArray(c) ? c : (c.items || c || []));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []); // load once

  const kpis = [
    { key: "alerts", label: "Low‑stock items", value: alerts.length },
    { key: "suggest", label: "Suggested POs", value: suggest.length },
    { key: "usage", label: "Items used (30d)", value: month.reduce((t, x) => t + (Number(x.total_used) || 0), 0) },
  ];

  const doQuickReorder = async (row) => {
    try {
      const pid = row.product_id ?? row.id;
      setBusyId(pid);
      const qty = Number(row.suggested_qty ?? row.reorder_target ?? 0);
      const vendor_id = row.vendor_id ?? null;
      if (!qty) {
        alert("No suggested quantity for this item.");
        return;
      }
      await quickReorder({ product_id: pid, qty, vendor_id });
      alert("Draft PO created.");
    } catch (e) {
      console.error(e);
      alert("Could not create draft PO.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>Inventory Overview</h1>
      </header>

      <section className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.key} className="kpi">
            <div className="kpi-value">{Number(k.value).toLocaleString()}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Low‑Stock Alerts</h3></div>
        <div className="table">
          <div className="thead">
            <div>SKU</div><div>Name</div><div>On hand</div><div>Min</div><div>Target</div><div></div>
          </div>
          <div className="tbody">
            {alerts.map((a) => {
              const key = a.product_id ?? a.id ?? a.sku;
              const pid = a.product_id ?? a.id;
              return (
                <div key={key} className="row">
                  <div className="mono">{a.sku}</div>
                  <div>{a.name}</div>
                  <div>{a.on_hand}</div>
                  <div>{a.reorder_min ?? "—"}</div>
                  <div>{a.reorder_target ?? "—"}</div>
                  <div className="row-actions">
                    <button
                      className="mini"
                      onClick={() => doQuickReorder(a)}
                      disabled={busyId === pid}
                    >
                      {busyId === pid ? "Adding…" : "Quick Reorder"}
                    </button>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && <div className="row"><div>All good.</div></div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Suggested Reorders</h3></div>
        <div className="table">
          <div className="thead">
            <div>SKU</div><div>Name</div><div>Suggested Qty</div><div>Vendor</div><div>Reason</div><div></div>
          </div>
          <div className="tbody">
            {suggest.map((r) => {
              const key = r.product_id ?? r.id ?? r.sku;
              const pid = r.product_id ?? r.id;
              return (
                <div key={key} className="row">
                  <div className="mono">{r.sku}</div>
                  <div>{r.name}</div>
                  <div>{r.suggested_qty}</div>
                  <div>{r.vendor_name || "—"}</div>
                  <div className="muted">{r.reason || "—"}</div>
                  <div className="row-actions">
                    <button
                      className="mini"
                      onClick={() => doQuickReorder(r)}
                      disabled={busyId === pid}
                    >
                      {busyId === pid ? "Adding…" : "Quick Reorder"}
                    </button>
                  </div>
                </div>
              );
            })}
            {suggest.length === 0 && <div className="row"><div>No suggestions.</div></div>}
          </div>
        </div>
      </section>
    </div>
  );
}