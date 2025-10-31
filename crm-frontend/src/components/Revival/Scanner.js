import React, { useState, useContext, useEffect } from 'react';
import api from '../../apiClient';
import aiApi from '../../aiApiClient';
import { AuthContext } from '../../App';
import {
  FilePlus, RotateCcw, Upload, Save,
  FileText, User, ListChecks, ClipboardList, Calendar
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Scanner.css';

function safeParse(json, fallback = {}) {
  try {
    if (!json || json === 'undefined' || json === 'null') return fallback;
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function formatDateForBackend(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

export default function Scanner() {
  const { user, tenant } = useContext(AuthContext) || {};
  const [imagePreview, setImagePreview] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [formData, setFormData] = useState({});
  const [lineItems, setLineItems] = useState([]);
  const [saved, setSaved] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [result, setResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  const email = user?.email || safeParse(localStorage.getItem('user'))?.email;
  const domain = tenant?.domain || safeParse(localStorage.getItem('activeTenant'))?.domain;

  useEffect(() => {
    if (formData?.line_items?.length) setLineItems(formData.line_items);
  }, [formData]);

  const fetchRecentScans = async () => {
    try {
      const res = await api.get('/revival/scanner/recent/');
      setRecentScans(res.data);
    } catch {
      console.warn('⚠️ Could not fetch recent scans');
    }
  };

  useEffect(() => { fetchRecentScans(); }, []);
  useEffect(() => { if (saved) fetchRecentScans(); }, [saved]);

  const normalizeLineItems = (items = []) =>
    items.map(({ id, ...item }) => ({
      ...item,
      description: item.description?.trim() || '',
      quantity: parseFloat(item.quantity) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      total_price: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
      category: item.category || '',
    }));

  const calculateTotal = (items = lineItems) =>
    items.reduce((acc, item) => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unit_price);
      return acc + (isNaN(qty) || isNaN(price) ? 0 : qty * price);
    }, 0);

  const extractData = async (base64) => {
    if (!email || !domain) return toast.error('Unauthorized');
    const scanToastId = toast.loading('Scanning document with AI...');
    setScanning(true);
    try {
      const res = await aiApi.post('/scan/quote/', {
        image: base64,
        tenant_id: domain,
        user_id: email,
        save_to_crm: false,
      });
      const { structured = {}, raw_text, ready_for_crm } = res.data;
      structured.line_items = normalizeLineItems(structured.line_items);
      structured.estimated_total = calculateTotal(structured.line_items);
      setFormData(structured);
      setLineItems(structured.line_items);
      setResult({ raw_text });
      toast.update(scanToastId, {
        render: '✅ AI extraction successful!',
        type: 'success',
        isLoading: false,
        autoClose: 2500,
      });
    } catch (err) {
      console.error('[❌ AI Extraction Error]', err);
      toast.update(scanToastId, {
        render: '❌ AI failed to extract quote details.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setManualMode(false);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result || '';
      // ✅ SAFER conversion: strips any MIME header
      const base64 = result.replace(/^data:(.*;base64,)?/, '');
      setBase64Image(base64);
      extractData(base64);
    };
    reader.readAsDataURL(file);
  };
  
  // 🔹 Handles file drag‑and‑drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
  
    setManualMode(false);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result || '';
      const base64 = result.replace(/^data:(.*;base64,)?/, '');
      setBase64Image(base64);
      extractData(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFieldChange = (key, value) => {
    const updated = { ...formData, [key]: value };
    if (['amount_paid', 'estimated_total'].includes(key)) {
      updated[key] = parseFloat(value) || 0;
    }
    setFormData(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    const item = updated[index];
    item[field] = value;
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unit_price);
    item.total_price = !isNaN(qty) && !isNaN(price) ? qty * price : 0;
    setLineItems([...updated]);
    setFormData((prev) => ({
      ...prev,
      estimated_total: calculateTotal(updated),
    }));
  };

  const addLineItem = () => {
    const newItems = [...lineItems, {
      description: '',
      quantity: '',
      unit_price: '',
      total_price: 0,
    }];
    setLineItems(newItems);
    setFormData((prev) => ({
      ...prev,
      line_items: newItems,
      estimated_total: calculateTotal(newItems),
    }));
  };

  const removeLineItem = (index) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
    setFormData((prev) => ({
      ...prev,
      line_items: newItems,
      estimated_total: calculateTotal(newItems),
    }));
  };

  const handleSave = async () => {
    try {
      const { id, ...cleanedFormData } = formData;
      const payload = {
        ...cleanedFormData,
        tenant_id: tenant?.domain,
        user_id: user?.email,
        line_items: normalizeLineItems(lineItems),
        estimated_total: calculateTotal(lineItems),
        quote_date: formatDateForBackend(formData.quote_date),
        source: manualMode ? 'manual' : 'scanner',
      };
      const res = await api.post('/revival/scanner/save/', payload);
      toast.success('✅ Quote saved to CRM!');
      setSaved(true);
      setTimeout(() => {
        setImagePreview(null);
        setBase64Image(null);
        setFormData({});
        setLineItems([]);
        setSaved(false);
        setManualMode(false);
        setResult(null);
      }, 1200);
    } catch (err) {
      console.error('[❌ Save Error]', err?.response?.data || err);
      toast.error(`Save failed: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const startManualEntry = () => {
    setManualMode(true);
    setFormData({});
    setLineItems([]);
    setImagePreview(null);
    setSaved(false);
  };

  const exportPDF = async () => {
    try {
      const res = await api.post(
        '/revival/generate-quote-pdf/',
        { ...formData, line_items: normalizeLineItems(lineItems) },
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `quote-${formData.customer_name || 'customer'}.pdf`;
      link.click();
      toast.info('📄 PDF downloaded.');
    } catch (err) {
      console.error('[❌ PDF Error]', err);
      toast.error('Failed to generate PDF.');
    }
  };

  const rescan = () => base64Image && extractData(base64Image);

  return (
    <div className="scanner-container" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <ToastContainer position="bottom-right" autoClose={2500} theme="colored" />

      <div className="scanner-layout">
        {/* Sidebar: Recent Scans */}
        <aside className="recent-scans">
          <h3>📄 Recent Scans</h3>
          <ul>
            {recentScans.length > 0 ? (
              recentScans.map((scan) => (
                <li key={scan.id}>
                  <span>{scan.customer_name || 'Unnamed'}</span>
                  <small>${scan.estimated_total} — {scan.status}</small>
                </li>
              ))
            ) : (
              <p className="empty">No recent scans</p>
            )}
          </ul>
        </aside>

        {/* Main Scanner Panel */}
        <div className="scanner-main">
          <div className="scanner-header">
            <h2><ClipboardList size={20} /> AI Quote Scanner</h2>
            <div className="scanner-actions">
              <button onClick={startManualEntry}><FilePlus size={16} /> Manual Entry</button>
              {imagePreview && <button onClick={rescan}><RotateCcw size={16} /> Rescan</button>}
            </div>
          </div>

          {!manualMode && (
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
          )}

          {imagePreview && <img src={imagePreview} alt="Preview" className="scanner-preview" />}
          {scanning && <p className="scanning-status">🔍 Scanning document with AI...</p>}

          {(manualMode || imagePreview) && (
            <div className="scanner-form">
              {/* Customer Info */}
              <h3><User size={18} /> Customer Information</h3>
              {[
                'customer_name', 'customer_email', 'customer_phone',
                'address', 'city', 'state', 'zip_code', 'service_type',
              ].map((key) => (
                <div key={key} className="form-group">
                  <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                  <input
                    type="text"
                    value={formData[key] || ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                  />
                </div>
              ))}

              {/* Quote Details */}
              <h3><FileText size={18} /> Quote Details</h3>
              <div className="form-group">
                <label>Quote Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label><Calendar size={14} /> Quote Date</label>
                <input
                  type="date"
                  value={formData.quote_date ? formatDateForBackend(formData.quote_date) : ''}
                  onChange={(e) => handleFieldChange('quote_date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || ''}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <option value="">Select status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="converted">Converted</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount Paid</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_paid || ''}
                  onChange={(e) => handleFieldChange('amount_paid', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <input
                  type="text"
                  value={formData.payment_method || ''}
                  onChange={(e) => handleFieldChange('payment_method', e.target.value)}
                />
              </div>

              {/* Line Items */}
              <h3><ListChecks size={18} /> Line Items</h3>
              {lineItems.map((item, i) => (
                <div key={i} className="line-item-row">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(i, 'description', e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Unit Price"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(i, 'unit_price', e.target.value)}
                  />
                  <input
                    type="text"
                    disabled
                    value={item.total_price?.toFixed(2) || '0.00'}
                    placeholder="Total"
                  />
                  <button type="button" className="muted-btn" onClick={() => removeLineItem(i)}>×</button>
                </div>
              ))}

              <button type="button" className="add-item-button" onClick={addLineItem}>
                <FilePlus size={14} /> Add New Item
              </button>

              <p className="total-line">
                <strong>Total:</strong> ${calculateTotal().toFixed(2)}
              </p>

              {!manualMode && result?.raw_text && (
                <details>
                  <summary>View Raw OCR Text</summary>
                  <pre>{result.raw_text}</pre>
                </details>
              )}

              {/* Actions */}
              <div className="action-buttons">
                <button onClick={handleSave} disabled={saved}>
                  <Save size={16} /> {saved ? 'Saved' : 'Save to CRM'}
                </button>
                <button onClick={exportPDF}>
                  <Upload size={16} /> Export PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}