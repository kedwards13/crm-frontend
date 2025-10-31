import React, { useEffect, useMemo, useState } from "react";
import useInventoryApi from "./useInventoryApi";

export default function StockPage(){
  const { listStock, postMovement, listProducts } = useInventoryApi();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ type:"receive", product_id:"", qty:"", uom:"ea", location_id:"", lot:"", expiry:"", note:"" });
  const load = async ()=>{
    setLoading(true);
    try{
      const [s, p] = await Promise.all([listStock({ limit:200 }), listProducts({ limit:500 })]);
      setRows(Array.isArray(s)?s:(s.results||[]));
      setProducts(Array.isArray(p)?p:(p.results||[]));
    } finally{ setLoading(false); }
  };
  useEffect(()=>{ load(); },[]); // eslint-disable-line

  const onSubmit = async e=>{
    e.preventDefault();
    const payload = {
      ...form,
      qty: form.qty===""?null:Number(form.qty),
      product: form.product_id,
    };
    await postMovement(payload);
    setForm(f=>({ ...f, qty:"", lot:"", expiry:"", note:"" }));
    await load();
  };

  const filtered = useMemo(()=> rows.filter(r=>{
    if(type!=="all" && r.type!==type) return false;
    if(q){
      const blob = `${r.product_sku} ${r.product_name} ${r.location_name} ${r.note||""}`.toLowerCase();
      if(!blob.includes(q.toLowerCase())) return false;
    }
    return true;
  }),[rows,q,type]);

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>Stock Movements</h1>
        <div className="filters">
          <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
          <select value={type} onChange={e=>setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="receive">receive</option>
            <option value="consume">consume</option>
            <option value="transfer_in">transfer_in</option>
            <option value="transfer_out">transfer_out</option>
            <option value="adjust">adjust</option>
            <option value="return">return</option>
          </select>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head"><h3>Quick Movement</h3></div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>Type
            <select name="type" value={form.type} onChange={e=>setForm(f=>({ ...f, type:e.target.value }))}>
              <option value="receive">receive</option>
              <option value="consume">consume</option>
              <option value="transfer_in">transfer_in</option>
              <option value="transfer_out">transfer_out</option>
              <option value="adjust">adjust</option>
              <option value="return">return</option>
            </select>
          </label>
          <label>Product
            <select name="product_id" value={form.product_id} onChange={e=>setForm(f=>({ ...f, product_id:e.target.value }))}>
              <option value="">—</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
          </label>
          <label>Qty<input type="number" value={form.qty} onChange={e=>setForm(f=>({ ...f, qty:e.target.value }))} /></label>
          <label>UoM<input value={form.uom} onChange={e=>setForm(f=>({ ...f, uom:e.target.value }))} /></label>
          <label>Location ID<input value={form.location_id} onChange={e=>setForm(f=>({ ...f, location_id:e.target.value }))} /></label>
          <label>Lot<input value={form.lot} onChange={e=>setForm(f=>({ ...f, lot:e.target.value }))} /></label>
          <label>Expiry<input type="date" value={form.expiry} onChange={e=>setForm(f=>({ ...f, expiry:e.target.value }))} /></label>
          <label>Note<input value={form.note} onChange={e=>setForm(f=>({ ...f, note:e.target.value }))} /></label>
          <div className="form-actions">
            <button className="secondary" type="button" onClick={()=>setForm({ type:"receive", product_id:"", qty:"", uom:"ea", location_id:"", lot:"", expiry:"", note:"" })}>Clear</button>
            <button type="submit">Log</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="table">
          <div className="thead">
            <div>When</div><div>Type</div><div>SKU</div><div>Name</div><div>Qty</div><div>UoM</div><div>Location</div><div>Lot</div><div>Expiry</div><div>Note</div>
          </div>
          <div className="tbody">
            {filtered.map(m=>(
              <div key={m.id} className="row">
                <div>{(m.created_at||"").slice(0,10)}</div>
                <div className="mono">{m.type}</div>
                <div className="mono">{m.product_sku}</div>
                <div>{m.product_name}</div>
                <div>{m.qty}</div>
                <div>{m.uom||"ea"}</div>
                <div>{m.location_name||"—"}</div>
                <div>{m.lot||"—"}</div>
                <div>{m.expiry||"—"}</div>
                <div>{m.note||"—"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}