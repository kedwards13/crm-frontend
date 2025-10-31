// crm-frontend/src/components/Operations/Inventory/ProductForm.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useInventoryApi from "./useInventoryApi";
import LabelCaptureModal from "./LabelCaptureModal";
import "./Inventory.css";

const EMPTY = {
  sku: "", name: "", type: "consumable", uom: "ea", upc: "",
  vendor_id: "", vendor_name: "",
  reorder_min: "", reorder_target: "",
  is_chemical: false, requires_lot: false, requires_expiry: false,
};

export default function ProductForm(){
  const { id } = useParams();
  const editing = !!id;
  const location = useLocation();
  const autoOpen = location.state?.openLabel === true;

  const { getProduct, createProduct, updateProduct, listVendors, ingestLabel } = useInventoryApi();
  const [form, setForm] = useState(EMPTY);
  const [vendors, setVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(autoOpen);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try { setVendors(await listVendors()); } catch {}
      if (editing){
        const p = await getProduct(id);
        setForm({
          sku: p.sku || "",
          name: p.name || "",
          type: p.type || "consumable",
          uom:  p.uom || "ea",
          upc:  p.upc || "",
          vendor_id: (p.vendor ?? p.vendor_id ?? "") || "",
          vendor_name: p.vendor_name || p.vendor?.name || "",
          reorder_min: p.reorder_min ?? "",
          reorder_target: p.reorder_target ?? "",
          is_chemical: !!p.is_chemical,
          requires_lot: !!p.requires_lot,
          requires_expiry: !!p.requires_expiry,
        });
      }
    })();
  }, [editing, id, getProduct, listVendors]);

  const mergeDraft = (draft) => {
    setForm(f => ({
      ...f,
      sku: draft.sku ?? f.sku,
      name: draft.name ?? f.name,
      type: draft.type ?? f.type,
      uom:  draft.uom  ?? f.uom,
      upc:  draft.upc  ?? f.upc,
      vendor_id: (draft.vendor ?? draft.vendor_id ?? f.vendor_id) || "",
      vendor_name: draft.vendor_name ?? f.vendor_name,
      reorder_min: draft.reorder_min ?? f.reorder_min,
      reorder_target: draft.reorder_target ?? f.reorder_target,
      is_chemical: draft.is_chemical ?? f.is_chemical,
      requires_lot: draft.requires_lot ?? f.requires_lot,
      requires_expiry: draft.requires_expiry ?? f.requires_expiry,
    }));
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? !!checked : value }));
  };

  const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.sku.trim()) return setErr("SKU is required.");
    if (!form.name.trim()) return setErr("Name is required.");

    setSaving(true);
    try{
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        type: form.type,
        uom:  form.uom,
        upc:  (form.upc || "").trim(),
        vendor: form.vendor_id ? Number(form.vendor_id) : null,
        reorder_min: numOrNull(form.reorder_min),
        reorder_target: numOrNull(form.reorder_target),
        is_chemical: !!form.is_chemical,
        requires_lot: !!form.requires_lot,
        requires_expiry: !!form.requires_expiry,
      };
      if (editing) await updateProduct(id, payload);
      else await createProduct(payload);
      navigate("/operations/inventory/products");
    } catch (e2) {
      console.error(e2);
      setErr("Could not save this product. Check the fields and try again.");
    } finally { setSaving(false); }
  };

  return (
    <div className="inventory-page">
      <header className="inventory-head">
        <h1>{editing ? "Edit Product" : "New Product"}</h1>
        {!editing && (
          <button className="btn mini" onClick={() => setModalOpen(true)}>+ From Label / Scan</button>
        )}
      </header>

      <section className="inventory-card">
        <form className="inventory-form" onSubmit={onSubmit} noValidate>
          {err && <div className="error" style={{ gridColumn: "1 / -1" }}>{err}</div>}

          <label>SKU<input name="sku" value={form.sku} onChange={onChange} required /></label>
          <label>Name<input name="name" value={form.name} onChange={onChange} required /></label>
          <label>Type
            <select name="type" value={form.type} onChange={onChange}>
              <option value="chemical">chemical</option>
              <option value="consumable">consumable</option>
              <option value="equipment">equipment</option>
              <option value="part">part</option>
            </select>
          </label>
          <label>UoM
            <select name="uom" value={form.uom} onChange={onChange}>
              <option value="ea">ea</option><option value="gal">gal</option>
              <option value="oz">oz</option><option value="lb">lb</option>
              <option value="bag">bag</option><option value="box">box</option>
            </select>
          </label>
          <label>UPC<input name="upc" value={form.upc} onChange={onChange} inputMode="numeric" /></label>
          <label>Vendor
            <select name="vendor_id" value={form.vendor_id ?? ""} onChange={onChange}>
              <option value="">—</option>
              {vendors.map(v => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
            </select>
          </label>
          <label>Reorder Min<input type="number" step="0.001" name="reorder_min" value={form.reorder_min} onChange={onChange} /></label>
          <label>Reorder Target<input type="number" step="0.001" name="reorder_target" value={form.reorder_target} onChange={onChange} /></label>

          <label className="checkbox-row"><span>Is Chemical</span>
            <input type="checkbox" name="is_chemical" checked={!!form.is_chemical} onChange={onChange} />
          </label>
          <label className="checkbox-row"><span>Requires Lot</span>
            <input type="checkbox" name="requires_lot" checked={!!form.requires_lot} onChange={onChange} />
          </label>
          <label className="checkbox-row"><span>Requires Expiry</span>
            <input type="checkbox" name="requires_expiry" checked={!!form.requires_expiry} onChange={onChange} />
          </label>

          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </section>

      <LabelCaptureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDraft={(d) => { mergeDraft(d); setModalOpen(false); }}
      />
    </div>
  );
}