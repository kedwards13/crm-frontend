import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getIndustry } from '../../../helpers/tenantHelpers';
import '../SettingsCommon.css';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:808';

const PRESETS = {
  pest_control: [
    { sku: 'PEST-GEN', name: 'General Pest Control', price: 129, unit: 'visit', tax: true },
    { sku: 'TERM-INS', name: 'Termite Inspection',   price: 89,  unit: 'inspection', tax: true },
    { sku: 'TERM-TRE', name: 'Termite Treatment',    price: 799, unit: 'job', tax: true },
    { sku: 'RODENT',   name: 'Rodent Exclusion',     price: 399, unit: 'job', tax: true },
  ],
  wholesaler: [
    { sku: 'LEAD-SRC', name: 'Lead Sourcing',        price: 0,   unit: 'n/a', tax: false },
  ],
  real_estate: [
    { sku: 'LIST-FEE', name: 'Listing Fee',          price: 0,   unit: '%',   tax: false },
  ],
  fitness: [
    { sku: 'MEM-BASE', name: 'Monthly Membership',   price: 59,  unit: 'month', tax: true },
    { sku: 'PT-SESS',  name: 'Personal Training',    price: 80,  unit: 'session', tax: true },
  ],
  general: []
};

export default function ProductCatalog() {
  const industryKey = getIndustry('general');
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/settings/products/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!mounted) return;
        const current = Array.isArray(data) ? data : [];
        setItems(current.length ? current : PRESETS[industryKey] || []);
      } catch {
        setItems(PRESETS[industryKey] || []);
      }
    })();
    return () => { mounted = false; };
  }, [token, industryKey]);

  const addRow = () => setItems(arr => [...arr, { sku: '', name: '', price: 0, unit: 'unit', tax: true }]);
  const update = (i, k, v) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const remove = (i) => setItems(arr => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setMsg('');
    try {
      await axios.put(`${API}/api/settings/products/`, { items }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Saved ✓');
    } catch {
      setMsg('Save failed.');
    }
  };

  return (
    <div className="settings-page">
      <h2>Products & Services</h2>
      {msg && <p className="settings-msg">{msg}</p>}
      <div className="settings-card">
        <div className="table-like">
          <div className="row header">
            <div>SKU</div><div>Name</div><div>Price</div><div>Unit</div><div>Tax</div><div></div>
          </div>
          {items.map((it, i) => (
            <div key={i} className="row">
              <input value={it.sku}  onChange={(e)=>update(i,'sku',e.target.value)} />
              <input value={it.name} onChange={(e)=>update(i,'name',e.target.value)} />
              <input type="number" value={it.price} onChange={(e)=>update(i,'price',Number(e.target.value||0))} />
              <input value={it.unit} onChange={(e)=>update(i,'unit',e.target.value)} />
              <input type="checkbox" checked={!!it.tax} onChange={(e)=>update(i,'tax',e.target.checked)} />
              <button className="mini danger" onClick={()=>remove(i)}>Delete</button>
            </div>
          ))}
        </div>
        <button className="mini" onClick={addRow}>Add item</button>
      </div>
      <button className="settings-primary" onClick={save}>Save</button>
    </div>
  );
}