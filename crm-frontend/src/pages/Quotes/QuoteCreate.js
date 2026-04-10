import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import './QuoteDetail.css';

const text = (value) => String(value || '').trim();

const LINE_ITEM_CATEGORIES = [
  'Materials',
  'Labor',
  'Permits & Fees',
  'Equipment',
  'Subcontractor',
  'Other',
];

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: 0, category: 'Materials' };

const createQuote = async (payload) => {
  try {
    return await api.post('/quotes/', payload);
  } catch (error) {
    if (Number(error?.response?.status || 0) !== 404) throw error;
    return api.post('/revival/', payload);
  }
};

const searchCustomers = async (query) => {
  if (!query || query.length < 2) return [];
  try {
    const response = await api.get('/customers/', { params: { search: query, page_size: 8 } });
    const data = response?.data;
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export default function QuoteCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  // Optional pre-fill when navigated here from a customer/lead card.
  // Pass via: navigate('/quotes/create', { state: { customer: {...} } })
  const prefill = location?.state?.customer || location?.state?.lead || null;
  const prefillName =
    text(prefill?.full_name) ||
    text(prefill?.name) ||
    [text(prefill?.first_name), text(prefill?.last_name)].filter(Boolean).join(' ') ||
    text(prefill?.company_name) ||
    '';
  const prefillPhone = text(prefill?.primary_phone || prefill?.phone || prefill?.phone_number);
  const prefillEmail = text(prefill?.primary_email || prefill?.email);
  const prefillId = prefill?.customer_id || prefill?.id || null;
  const prefillTitle = prefillName ? `Quote for ${prefillName}` : '';
  const prefillService = text(prefill?.service_type || prefill?.service);
  const prefillDescription = text(prefill?.message || prefill?.notes);

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState(prefillDescription);
  const [serviceType, setServiceType] = useState(prefillService);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);

  // Customer fields
  const [customerName, setCustomerName] = useState(prefillName);
  const [customerPhone, setCustomerPhone] = useState(prefillPhone);
  const [customerEmail, setCustomerEmail] = useState(prefillEmail);
  const [customerId, setCustomerId] = useState(prefillId);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Line items
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const tax = subtotal * (Number(taxRate) || 0) / 100;
  const total = subtotal + tax;

  const handleCustomerSearch = async (query) => {
    setCustomerSearch(query);
    setCustomerName(query);
    setCustomerId(null);
    if (query.length >= 2) {
      const results = await searchCustomers(query);
      setCustomerResults(results);
      setSearchOpen(results.length > 0);
    } else {
      setCustomerResults([]);
      setSearchOpen(false);
    }
  };

  const selectCustomer = (customer) => {
    const name =
      text(customer.company_name) ||
      text(customer.full_name) ||
      [text(customer.first_name), text(customer.last_name)].filter(Boolean).join(' ') ||
      'Customer';
    setCustomerName(name);
    setCustomerPhone(text(customer.primary_phone || customer.phone));
    setCustomerEmail(text(customer.primary_email || customer.email));
    setCustomerId(customer.id || customer.customer_id);
    setSearchOpen(false);
    setCustomerSearch('');
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async (andSend = false) => {
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!items.some((item) => text(item.description))) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: text(title) || `Quote for ${customerName}`,
        description: text(description),
        service_type: text(serviceType),
        notes: text(notes),
        status: 'draft',
        source: 'manual',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        tax_rate: Number(taxRate) || 0,
        estimated_total: total,
        line_items: items
          .filter((item) => text(item.description))
          .map((item) => ({
            description: text(item.description),
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            total_price: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
            category: text(item.category) || 'Other',
          })),
      };
      if (customerId) {
        payload.customer = customerId;
        payload.customer_id = customerId;
      }

      const response = await createQuote(payload);
      const newId = text(response?.data?.id || response?.data?.quote_id);
      toast.success('Quote created');

      if (andSend && newId) {
        navigate(`/quotes/${newId}`);
      } else if (newId) {
        navigate(`/quotes/${newId}`);
      } else {
        navigate('/revival/overview');
      }
    } catch (err) {
      toast.error(
        text(err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to create quote')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quote-detail-page">
      <div className="quote-detail-shell">
        <div className="quote-detail-toolbar">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="quote-detail-toolbar-actions">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
              Save &amp; Open
            </Button>
          </div>
        </div>

        <section className="quote-detail-hero">
          <div>
            <p className="quote-detail-eyebrow">New Quote</p>
            <h1>{text(title) || text(customerName) || 'Untitled Quote'}</h1>
          </div>
          <div className="quote-total-card">
            <span>Estimated Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </section>

        <div className="quote-detail-grid">
          <section className="quote-detail-card">
            <h2>Customer</h2>
            <div className="quote-edit-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="quote-edit-field" style={{ position: 'relative' }}>
                <span>Name (search or type new)</span>
                <input
                  value={customerName}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  placeholder="Search existing or type new name"
                />
                {searchOpen ? (
                  <div className="quote-customer-dropdown">
                    {customerResults.map((c) => {
                      const label =
                        text(c.company_name) ||
                        text(c.full_name) ||
                        [text(c.first_name), text(c.last_name)].filter(Boolean).join(' ') ||
                        'Customer';
                      return (
                        <button
                          key={c.id || c.customer_id}
                          type="button"
                          className="quote-customer-option"
                          onClick={() => selectCustomer(c)}
                        >
                          <strong>{label}</strong>
                          <span>{text(c.primary_phone) || text(c.primary_email) || ''}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </label>
              <label className="quote-edit-field">
                <span>Phone</span>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(555) 123-4567" />
              </label>
              <label className="quote-edit-field">
                <span>Email</span>
                <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" />
              </label>
            </div>
          </section>

          <section className="quote-detail-card">
            <h2>Quote Info</h2>
            <div className="quote-edit-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="quote-edit-field">
                <span>Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Roof Replacement — 123 Main St" />
              </label>
              <label className="quote-edit-field">
                <span>Service Type</span>
                <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Roof replacement, inspection, etc." />
              </label>
              <label className="quote-edit-field">
                <span>Tax Rate (%)</span>
                <input type="number" min="0" max="25" step="0.25" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        <section className="quote-detail-card">
          <div className="quote-detail-section-head">
            <div>
              <h2>Line Items</h2>
              <p>Group charges by category (Materials, Labor, Permits) — they render grouped on the customer portal.</p>
            </div>
            <Button variant="outline" onClick={addItem}>
              + Add Item
            </Button>
          </div>

          <div className="quote-detail-table-wrap">
            <table className="quote-detail-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Category</th>
                  <th style={{ width: '42%' }}>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                  return (
                    <tr key={index}>
                      <td>
                        <select
                          className="quote-create-input"
                          value={item.category || ''}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                        >
                          {LINE_ITEM_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="quote-create-input"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Tear-off existing shingles"
                        />
                      </td>
                      <td>
                        <input
                          className="quote-create-input quote-create-input-sm"
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="quote-create-input quote-create-input-sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        />
                      </td>
                      <td>{formatCurrency(lineTotal)}</td>
                      <td>
                        {items.length > 1 ? (
                          <button type="button" className="quote-remove-btn" onClick={() => removeItem(index)}>
                            &times;
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right' }}>Subtotal</td>
                  <td>{formatCurrency(subtotal)}</td>
                  <td></td>
                </tr>
                {tax > 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'right' }}>Tax ({taxRate}%)</td>
                    <td>{formatCurrency(tax)}</td>
                    <td></td>
                  </tr>
                ) : null}
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="quote-detail-card">
          <h2>Description &amp; Notes</h2>
          <div className="quote-edit-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="quote-edit-field">
              <span>Description / Scope of Work</span>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full roof replacement including..." />
            </label>
            <label className="quote-edit-field">
              <span>Internal Notes</span>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for your team (not shown to customer)" />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
