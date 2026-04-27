import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../apiClient';
import { createD2DSale } from '../../api/salesApi';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import './Sales.css';

const text = (v) => String(v || '').trim();

const FREQUENCIES = ['one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];
const FREQ_LABELS = {
  one_time: 'One-Time',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const EMPTY_SERVICE = { type: '', frequency: 'monthly', price: '' };

const searchCustomers = async (query) => {
  if (!query || query.length < 2) return [];
  try {
    const r = await api.get('/customers/', { params: { search: query, page_size: 6 } });
    const d = r?.data;
    return Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
};

export default function D2DSaleForm() {
  const navigate = useNavigate();

  // ── Customer ──
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // ── Customer search ──
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // ── Services ──
  const [services, setServices] = useState([{ ...EMPTY_SERVICE }]);

  // ── Scheduling ──
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  // ── Options ──
  const [notes, setNotes] = useState('');
  const [pricingLocked, setPricingLocked] = useState(false);
  const [sendQuote, setSendQuote] = useState(false);
  const [autoConvert, setAutoConvert] = useState(false);

  // ── State ──
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // ── Customer search handler ──
  const handleNameSearch = useCallback(async (query) => {
    setCustomerName(query);
    if (query.length >= 2) {
      const results = await searchCustomers(query);
      setSearchResults(results);
      setSearchOpen(results.length > 0);
    } else {
      setSearchResults([]);
      setSearchOpen(false);
    }
  }, []);

  const selectCustomer = (c) => {
    const name =
      text(c.company_name) ||
      text(c.full_name) ||
      [text(c.first_name), text(c.last_name)].filter(Boolean).join(' ') ||
      '';
    setCustomerName(name);
    setPhone(text(c.primary_phone || c.phone || c.phone_number));
    setEmail(text(c.primary_email || c.email));
    setAddress(text(c.address || c.service_address));
    setCity(text(c.city));
    setState(text(c.state));
    setZipCode(text(c.zip_code || c.zip));
    setSearchOpen(false);
    setSearchResults([]);
  };

  // ── Services handlers ──
  const updateService = (i, field, value) => {
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };
  const addService = () => setServices((prev) => [...prev, { ...EMPTY_SERVICE }]);
  const removeService = (i) => {
    setServices((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const totalPrice = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  // ── Submit ──
  const handleSubmit = async () => {
    if (!text(customerName)) {
      toast.error('Customer name is required');
      return;
    }
    if (!text(address)) {
      toast.error('Service address is required');
      return;
    }
    const validServices = services.filter((s) => text(s.type) && Number(s.price) > 0);
    if (validServices.length === 0) {
      toast.error('Add at least one service with type and price');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_name: text(customerName),
        address: text(address),
        phone: text(phone) || undefined,
        email: text(email) || undefined,
        city: text(city) || undefined,
        state: text(state) || undefined,
        zip_code: text(zipCode) || undefined,
        services: validServices.map((s) => ({
          type: text(s.type),
          frequency: s.frequency || 'monthly',
          price: Number(s.price) || 0,
        })),
        notes: text(notes) || undefined,
        source: 'd2d',
        pricing_source: 'manual',
        pricing_locked: pricingLocked,
        send_quote: sendQuote,
        auto_convert: pricingLocked && autoConvert,
      };
      if (scheduleEnabled && scheduleDate) {
        payload.schedule_date = scheduleDate;
        payload.schedule_time = scheduleTime || '09:00';
      }

      const response = await createD2DSale(payload);
      setResult(response?.data || response);
      toast.success('Sale created successfully');
    } catch (err) {
      const detail =
        text(err?.response?.data?.detail) ||
        text(err?.response?.data?.error) ||
        text(err?.message) ||
        'Failed to create sale';
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success view ──
  if (result) {
    return (
      <div className="sales-page">
        <div className="sales-shell">
          <div className="sales-toolbar">
            <Button variant="ghost" onClick={() => navigate('/sales/d2d')}>
              Back to Sales
            </Button>
          </div>
          <section className="sales-card sales-success-card">
            <div className="sales-success-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="var(--success)" fillOpacity="0.15" />
                <path d="M15 24.5L21 30.5L33 18.5" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="sales-success-title">Sale Created</h1>
            <p className="sales-success-sub">
              {result.customer_created ? 'New customer created' : 'Matched existing customer'}{' '}
              {result.scheduled ? '— first service scheduled' : ''}
            </p>

            <div className="sales-result-grid">
              <div className="sales-result-item">
                <span className="sales-result-label">Customer</span>
                <span className="sales-result-value">#{result.customer_id}</span>
              </div>
              {result.appointment_id && (
                <div className="sales-result-item">
                  <span className="sales-result-label">Appointment</span>
                  <span className="sales-result-value">{String(result.appointment_id).slice(0, 8)}...</span>
                </div>
              )}
              {result.quote_id && (
                <div className="sales-result-item">
                  <span className="sales-result-label">Quote</span>
                  <span className="sales-result-value">
                    {result.quote_number || `#${result.quote_id}`}
                  </span>
                </div>
              )}
              {result.quote_created && (
                <div className="sales-result-item">
                  <span className="sales-result-label">Quote Status</span>
                  <span className="sales-result-value sales-pill-success">
                    {result.quote_sent ? 'Sent' : 'Draft'}
                    {result.auto_converted ? ' — Auto-Converted' : ''}
                  </span>
                </div>
              )}
              {result.first_service && (
                <div className="sales-result-item">
                  <span className="sales-result-label">First Service</span>
                  <span className="sales-result-value sales-pill-accent">Yes</span>
                </div>
              )}
              {result.appointment_reused && (
                <div className="sales-result-item">
                  <span className="sales-result-label">Note</span>
                  <span className="sales-result-value">Existing appointment reused</span>
                </div>
              )}
              {result.pricing_warnings && result.pricing_warnings.length > 0 && (
                <div className="sales-result-item sales-result-item-full">
                  <span className="sales-result-label">Pricing Warnings</span>
                  <ul className="sales-result-warnings">
                    {result.pricing_warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="sales-success-actions">
              <Button variant="outline" onClick={() => { setResult(null); setCustomerName(''); setPhone(''); setEmail(''); setAddress(''); setCity(''); setState(''); setZipCode(''); setServices([{ ...EMPTY_SERVICE }]); setNotes(''); setScheduleEnabled(false); setScheduleDate(''); setPricingLocked(false); setSendQuote(false); setAutoConvert(false); }}>
                New Sale
              </Button>
              {result.quote_id && (
                <Button variant="primary" onClick={() => navigate(`/quotes/${result.quote_id}`)}>
                  View Quote
                </Button>
              )}
              {result.appointment_id && (
                <Button variant="outline" onClick={() => navigate('/schedule/day')}>
                  Open Dispatch
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="sales-page">
      <div className="sales-shell">
        <div className="sales-toolbar">
          <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
          <div className="sales-toolbar-actions">
            <div className="sales-total-badge">
              <span>Total</span>
              <strong>{formatCurrency(totalPrice)}</strong>
            </div>
            <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Sale'}
            </Button>
          </div>
        </div>

        <section className="sales-hero">
          <div>
            <p className="sales-eyebrow">D2D Sale</p>
            <h1>{text(customerName) || 'New Sale'}</h1>
          </div>
          <div className="sales-hero-badges">
            <span className="sales-source-pill">d2d</span>
            {scheduleEnabled && <span className="sales-source-pill is-sched">Scheduling</span>}
            {sendQuote && <span className="sales-source-pill is-quote">Send Quote</span>}
          </div>
        </section>

        {/* ── Customer + Address ── */}
        <div className="sales-grid-2">
          <section className="sales-card">
            <h2>Customer</h2>
            <div className="sales-field-stack">
              <label className="sales-field" style={{ position: 'relative' }}>
                <span>Name</span>
                <input
                  value={customerName}
                  onChange={(e) => handleNameSearch(e.target.value)}
                  placeholder="Search existing or type new name"
                />
                {searchOpen && (
                  <div className="sales-dropdown">
                    {searchResults.map((c) => {
                      const label =
                        text(c.company_name) || text(c.full_name) ||
                        [text(c.first_name), text(c.last_name)].filter(Boolean).join(' ') || 'Customer';
                      return (
                        <button key={c.id || c.customer_id} type="button" className="sales-dropdown-item" onClick={() => selectCustomer(c)}>
                          <strong>{label}</strong>
                          <span>{text(c.primary_phone || c.phone) || text(c.primary_email || c.email)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </label>
              <label className="sales-field">
                <span>Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </label>
              <label className="sales-field">
                <span>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" type="email" />
              </label>
            </div>
          </section>

          <section className="sales-card">
            <h2>Service Address</h2>
            <div className="sales-field-stack">
              <label className="sales-field">
                <span>Street</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
              </label>
              <div className="sales-field-row-3">
                <label className="sales-field">
                  <span>City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tampa" />
                </label>
                <label className="sales-field">
                  <span>State</span>
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="FL" maxLength={2} />
                </label>
                <label className="sales-field">
                  <span>Zip</span>
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="33601" maxLength={10} />
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* ── Services ── */}
        <section className="sales-card">
          <div className="sales-section-head">
            <div>
              <h2>Services</h2>
              <p>Add each service being sold. Price is per-occurrence.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addService}>+ Add Service</Button>
          </div>
          <div className="sales-table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Service Type</th>
                  <th style={{ width: '26%' }}>Frequency</th>
                  <th style={{ width: '22%' }}>Price</th>
                  <th style={{ width: '14%' }}></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="sales-input"
                        value={s.type}
                        onChange={(e) => updateService(i, 'type', e.target.value)}
                        placeholder="Lawn care, pest treatment..."
                      />
                    </td>
                    <td>
                      <select
                        className="sales-input"
                        value={s.frequency}
                        onChange={(e) => updateService(i, 'frequency', e.target.value)}
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="sales-input sales-input-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={s.price}
                        onChange={(e) => updateService(i, 'price', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      {services.length > 1 && (
                        <button type="button" className="sales-remove-btn" onClick={() => removeService(i)}>&times;</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(totalPrice)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── Schedule + Options ── */}
        <div className="sales-grid-2">
          <section className="sales-card">
            <h2>First Service</h2>
            <div className="sales-field-stack">
              <label className="sales-toggle-row">
                <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} />
                <span>Schedule first service appointment</span>
              </label>
              {scheduleEnabled && (
                <div className="sales-field-row-2">
                  <label className="sales-field">
                    <span>Date</span>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                  </label>
                  <label className="sales-field">
                    <span>Time</span>
                    <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                  </label>
                </div>
              )}
            </div>
          </section>

          <section className="sales-card">
            <h2>Quote &amp; Pricing</h2>
            <div className="sales-field-stack">
              <label className="sales-toggle-row">
                <input type="checkbox" checked={pricingLocked} onChange={(e) => { setPricingLocked(e.target.checked); if (!e.target.checked) setAutoConvert(false); }} />
                <span>Lock pricing (no negotiation)</span>
              </label>
              <label className="sales-toggle-row">
                <input type="checkbox" checked={sendQuote} onChange={(e) => setSendQuote(e.target.checked)} />
                <span>Send quote to customer</span>
              </label>
              <label className="sales-toggle-row">
                <input
                  type="checkbox"
                  checked={autoConvert}
                  disabled={!pricingLocked}
                  onChange={(e) => setAutoConvert(e.target.checked)}
                />
                <span className={!pricingLocked ? 'is-disabled' : ''}>
                  Auto-convert to agreement {!pricingLocked && <em>(requires locked pricing)</em>}
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* ── Notes ── */}
        <section className="sales-card">
          <h2>Notes</h2>
          <label className="sales-field">
            <span>Sales / first-service notes (visible to assigned tech)</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code 1234, dog in back yard, treat north side first..." />
          </label>
        </section>
      </div>
    </div>
  );
}
