// crm-frontend/src/components/Operations/Inventory/ProductsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useInventoryApi from "./useInventoryApi";
import "./Inventory.css";

export default function ProductsPage() {
  const { listProducts, deleteProduct } = useInventoryApi();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      const pType = p.type || "other";
      if (type !== "all" && pType !== type) return false;
      if (q) {
        const vendorLabel = p.vendor_name || p.vendor?.name || "";
        const blob = `${p.sku} ${p.name} ${vendorLabel} ${p.upc}`.toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, type]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await deleteProduct(id);
    await load();
  };

  return (
    <div className="inventory-page">
      <header className="inventory-head">
        <h1>Products</h1>
        <div className="filters">
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="chemical">chemical</option>
            <option value="consumable">consumable</option>
            <option value="equipment">equipment</option>
            <option value="part">part</option>
          </select>
          <button className="btn mini" onClick={() => navigate("new")}>+ New Product</button>
          <button className="btn mini secondary" onClick={() => navigate("new?mode=scan")}>+ From Label</button>
        </div>
      </header>

      <section className="inventory-card">
        <div className="inventory-table">
          <div className="inventory-thead">
            <div>SKU</div><div>Name</div><div>Type</div><div>UoM</div>
            <div>Vendor</div><div>Reorder Min</div><div>Target</div><div>Flags</div><div></div>
          </div>
          <div>
            {loading && <div className="inventory-row"><div>Loading…</div></div>}
            {!loading && filtered.map((p) => (
              <div className="inventory-row" key={p.id}>
                <div className="mono">{p.sku || "—"}</div>
                <div>{p.name}</div>
                <div className="cap">{p.type || "other"}</div>
                <div>{p.uom || "—"}</div>
                <div>{p.vendor_name || p.vendor?.name || "—"}</div>
                <div>{p.reorder_min ?? "—"}</div>
                <div>{p.reorder_target ?? "—"}</div>
                <div className="muted">
                  {p.is_chemical ? "chemical" : ""} {p.requires_lot ? "• lot" : ""} {p.requires_expiry ? "• expiry" : ""}
                </div>
                <div className="inventory-actions">
                  <Link to={`${p.id}/edit`}>Edit</Link>
                  <button className="btn mini secondary" onClick={() => onDelete(p.id)}>Delete</button>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="inventory-row"><div>No products yet. Click “New Product” or “From Label”.</div></div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}