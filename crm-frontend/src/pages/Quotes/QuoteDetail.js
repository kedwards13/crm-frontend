import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import './QuoteDetail.css';

const IMAGE_EXTS = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)(\?|$)/i;
const isImageUrl = (url) => IMAGE_EXTS.test(String(url || ''));

const text = (value) => String(value || '').trim();

const parseItems = (quote) => {
  if (Array.isArray(quote?.items)) return quote.items;
  if (Array.isArray(quote?.line_items)) return quote.line_items;
  return [];
};

const parseAttachments = (quote) =>
  [
    quote?.scanned_file,
    quote?.attachment,
    quote?.pdf_url,
    quote?.file_url,
    ...(Array.isArray(quote?.attachments) ? quote.attachments : []),
  ]
    .flat()
    .filter(Boolean)
    .map((item) => (typeof item === 'string' ? item : item?.url || item?.file || item?.name || ''))
    .filter(Boolean);

const fetchQuoteDetail = async (quoteId) => {
  try {
    return await api.get(`/quotes/${quoteId}/`);
  } catch (error) {
    if (Number(error?.response?.status || 0) !== 404) throw error;
    return api.get(`/revival/${quoteId}/`);
  }
};

const patchQuoteDetail = async (quoteId, payload) => {
  try {
    return await api.patch(`/quotes/${quoteId}/`, payload);
  } catch (error) {
    if (Number(error?.response?.status || 0) !== 404) throw error;
    return api.patch(`/revival/${quoteId}/`, payload);
  }
};

const createQuoteCopy = async (payload) => {
  try {
    return await api.post('/quotes/', payload);
  } catch (error) {
    if (Number(error?.response?.status || 0) !== 404) throw error;
    return api.post('/revival/', payload);
  }
};

const convertQuote = async (quoteId) => {
  try {
    return await api.post(`/quotes/${quoteId}/convert/`);
  } catch (error) {
    if (Number(error?.response?.status || 0) !== 404) throw error;
    return api.post(`/revival/${quoteId}/convert/`);
  }
};

const sendQuote = async (quoteId, { delivery = 'sms', phone = '', email = '' } = {}) => {
  const payload = { delivery };
  if (delivery === 'sms' && phone) payload.phone = phone;
  if (delivery === 'email' && email) payload.email = email;
  try {
    return await api.post(`/quotes/${quoteId}/send/`, payload);
  } catch (error) {
    if (Number(error?.response?.status || 0) !== 404) throw error;
    return api.post(`/revival/${quoteId}/send-again/`, payload);
  }
};

const buildDuplicatePayload = (quote) => ({
  title: text(quote?.title) ? `${text(quote.title)} Copy` : 'Quote Copy',
  description: text(quote?.description),
  notes: text(quote?.notes),
  status: 'draft',
  service_type: text(quote?.service_type),
  customer: quote?.customer?.id || quote?.customer_id || undefined,
  customer_id: quote?.customer?.id || quote?.customer_id || undefined,
  customer_name: text(quote?.customer_name),
  customer_phone: text(quote?.customer_phone),
  customer_email: text(quote?.customer_email),
  lead: quote?.lead?.id || quote?.lead_id || undefined,
  lead_id: quote?.lead?.id || quote?.lead_id || undefined,
  address: text(quote?.address),
  city: text(quote?.city),
  state: text(quote?.state),
  zip_code: text(quote?.zip_code || quote?.zip),
  estimated_total: Number(quote?.estimated_total ?? quote?.total ?? 0) || 0,
  total: Number(quote?.total ?? quote?.estimated_total ?? 0) || 0,
  line_items: parseItems(quote).map((item) => ({
    description: text(item?.description),
    quantity: Number(item?.quantity || 1) || 1,
    unit_price: Number(item?.unit_price ?? item?.price ?? item?.amount ?? 0) || 0,
    total_price: Number(item?.total_price ?? item?.amount ?? item?.unit_price ?? item?.price ?? 0) || 0,
  })),
});

export default function QuoteDetail() {
  const navigate = useNavigate();
  const { quoteId = '' } = useParams();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    service_type: '',
    status: 'draft',
    notes: '',
  });
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDelivery, setSendDelivery] = useState('sms');
  const [sendPhone, setSendPhone] = useState('');
  const [sendEmail, setSendEmail] = useState('');

  // Quote file attachments (photos, PDFs, etc. stored in StoredFile)
  const [quoteFiles, setQuoteFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadQuoteFiles = async () => {
    if (!quoteId) return;
    try {
      const resp = await api.get('/storage/files/', { params: { quote: quoteId } });
      const data = resp?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setQuoteFiles(list);
    } catch {
      // ignore — gallery stays empty
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', 'job_image');
        fd.append('quote', quoteId);
        // eslint-disable-next-line no-await-in-loop
        await api.post('/storage/files/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded`);
      await loadQuoteFiles();
    } catch (err) {
      toast.error(
        text(err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Upload failed')
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchQuoteDetail(quoteId);
        if (!cancelled) {
          const next = response?.data || null;
          setQuote(next);
          setForm({
            title: text(next?.title || next?.name),
            description: text(next?.description),
            service_type: text(next?.service_type),
            status: text(next?.status || 'draft') || 'draft',
            notes: text(next?.notes),
          });
          void loadQuoteFiles();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            text(
              err?.response?.data?.detail ||
                err?.response?.data?.error ||
                err?.message ||
                'Unable to load quote detail.'
            )
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (quoteId) void load();
    else {
      setLoading(false);
      setError('Quote ID is missing.');
    }

    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  const items = useMemo(() => parseItems(quote), [quote]);
  const attachments = useMemo(() => parseAttachments(quote), [quote]);
  const total = Number(quote?.estimated_total ?? quote?.total ?? 0) || 0;
  const customerId = text(
    quote?.customer?.id || quote?.customer_id || quote?.customer?.customer_id || quote?.customer_external_id
  );

  const openSendModal = () => {
    setSendPhone(text(quote?.customer_phone));
    setSendEmail(text(quote?.customer_email));
    setSendDelivery(text(quote?.customer_phone) ? 'sms' : 'email');
    setShowSendModal(true);
  };

  const handleSend = async () => {
    setShowSendModal(false);
    setSaving(true);
    setError('');
    try {
      await sendQuote(quoteId, {
        delivery: sendDelivery,
        phone: sendPhone,
        email: sendEmail,
      });
      const response = await fetchQuoteDetail(quoteId);
      setQuote(response?.data || null);
    } catch (err) {
      setError(text(err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to send quote.'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (type) => {
    setSaving(true);
    setError('');
    try {
      if (type === 'duplicate') {
        const res = await createQuoteCopy(buildDuplicatePayload(quote));
        const nextId = text(res?.data?.id || res?.data?.quote_id);
        if (nextId) {
          navigate(`/quotes/${nextId}`);
          return;
        }
      }
      if (type === 'convert') await convertQuote(quoteId);
      const response = await fetchQuoteDetail(quoteId);
      setQuote(response?.data || null);
    } catch (err) {
      setError(text(err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Quote action failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: text(form.title),
        description: text(form.description),
        service_type: text(form.service_type),
        status: text(form.status || 'draft') || 'draft',
        notes: text(form.notes),
      };
      const response = await patchQuoteDetail(quoteId, payload);
      setQuote((prev) => ({ ...(prev || {}), ...(response?.data || {}), ...payload }));
      setEditing(false);
    } catch (err) {
      setError(text(err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Unable to save quote.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="quote-detail-page">
        <div className="quote-detail-shell">
          <p className="quote-detail-copy">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="quote-detail-page">
        <div className="quote-detail-shell">
          <div className="quote-detail-toolbar">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
          <div className="quote-detail-card">
            <p className="quote-detail-error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-detail-page">
      <div className="quote-detail-shell">
        <div className="quote-detail-toolbar">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="quote-detail-toolbar-actions">
            {customerId ? (
              <Button variant="outline" onClick={() => navigate(`/customers/${customerId}`)}>
                Customer
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setEditing((current) => !current)}>
              {editing ? 'Close Edit' : 'Edit'}
            </Button>
            <Button variant="outline" onClick={() => runAction('duplicate')} disabled={saving}>
              Duplicate
            </Button>
            <Button variant="outline" onClick={openSendModal} disabled={saving}>
              Send
            </Button>
            <Button variant="outline" onClick={() => runAction('convert')} disabled={saving}>
              Convert to Contract
            </Button>
            <Button variant="outline" onClick={() => navigate(`/revival/overview?quote_id=${encodeURIComponent(quoteId)}`)}>
              Revival Overview
            </Button>
            <Button variant="outline" onClick={() => navigate('/revival/scanner')}>
              Scan Another
            </Button>
          </div>
        </div>

        {error ? (
          <div className="quote-detail-card">
            <p className="quote-detail-error">{error}</p>
          </div>
        ) : null}

        <section className="quote-detail-hero">
          <div>
            <p className="quote-detail-eyebrow">Quote Detail</p>
            <h1>{text(quote?.customer_name) || text(quote?.title) || 'Quote'}</h1>
            <div className="quote-detail-meta">
              <span className={`quote-status-pill is-${text(quote?.status || 'draft').toLowerCase()}`}>
                {text(quote?.status || 'draft').replace(/_/g, ' ')}
              </span>
              {text(quote?.service_type) ? <span>{quote.service_type}</span> : null}
              {text(quote?.customer_phone) ? <span>{quote.customer_phone}</span> : null}
            </div>
          </div>
          <div className="quote-total-card">
            <span>Estimated Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </section>

        <div className="quote-detail-grid">
          <section className="quote-detail-card">
            <h2>Customer</h2>
            <dl className="quote-detail-kv">
              <div>
                <dt>Name</dt>
                <dd>{text(quote?.customer_name) || 'N/A'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{text(quote?.address) || 'N/A'}</dd>
              </div>
              <div>
                <dt>City / State</dt>
                <dd>{[text(quote?.city), text(quote?.state)].filter(Boolean).join(', ') || 'N/A'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{text(quote?.status || 'draft').replace(/_/g, ' ')}</dd>
              </div>
            </dl>
          </section>

          <section className="quote-detail-card">
            <h2>Quote Summary</h2>
            <dl className="quote-detail-kv">
              <div>
                <dt>Quote ID</dt>
                <dd>{text(quote?.id) || 'N/A'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{text(quote?.created_at) ? new Date(quote.created_at).toLocaleString() : 'N/A'}</dd>
              </div>
              <div>
                <dt>Quote Date</dt>
                <dd>{text(quote?.quote_date) || 'N/A'}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{text(quote?.source || 'manual')}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="quote-detail-card">
          <div className="quote-detail-section-head">
            <div>
              <h2>Line Items</h2>
              <p>Operator review for service descriptions, amounts, and totals.</p>
            </div>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <div className="quote-detail-table-wrap">
            <table className="quote-detail-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item, index) => (
                    <tr key={item.id || `${item.description}-${index}`}>
                      <td>{text(item.description) || 'Unnamed item'}</td>
                      <td>{Number(item.quantity || 1) || 1}</td>
                      <td>{formatCurrency(Number(item.unit_price || 0) || 0)}</td>
                      <td>{formatCurrency(Number(item.total_price ?? item.amount ?? 0) || 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="quote-detail-empty">
                      No line items were stored for this quote.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editing ? (
          <section className="quote-detail-card">
            <div className="quote-detail-section-head">
              <div>
                <h2>Edit Quote</h2>
                <p>Save through the existing quote detail endpoint.</p>
              </div>
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            <div className="quote-edit-grid">
              <label className="quote-edit-field">
                <span>Title</span>
                <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
              </label>
              <label className="quote-edit-field">
                <span>Service</span>
                <input
                  value={form.service_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, service_type: e.target.value }))}
                />
              </label>
              <label className="quote-edit-field">
                <span>Status</span>
                <input value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} />
              </label>
              <label className="quote-edit-field quote-edit-field-full">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </label>
              <label className="quote-edit-field quote-edit-field-full">
                <span>Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={4} />
              </label>
            </div>
          </section>
        ) : null}

        {text(quote?.notes || quote?.description) ? (
          <section className="quote-detail-card">
            <h2>Notes</h2>
            <p className="quote-detail-notes">{text(quote?.notes || quote?.description)}</p>
          </section>
        ) : null}

        <section className="quote-detail-card">
          <div className="quote-detail-section-head">
            <div>
              <h2>Photos &amp; Attachments</h2>
              <p>Upload job photos (before/after, damage, roof inspection) — these are stored with the quote and the customer account.</p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : '+ Upload Photos'}
              </Button>
            </div>
          </div>

          {quoteFiles.length === 0 && attachments.length === 0 ? (
            <p className="quote-detail-copy">No photos or attachments yet. Upload photos from the roof inspection to include them in the customer's proposal file.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
                marginTop: 12,
              }}
            >
              {quoteFiles.map((f) => {
                const url = f.file || f.url || '';
                const isImg = isImageUrl(url) || (f.mime_type || '').startsWith('image/') || f.category === 'job_image';
                return (
                  <a
                    key={f.id || f.file_uuid || url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#f8fafc',
                      textDecoration: 'none',
                      color: '#0f172a',
                    }}
                    title={f.name || url}
                  >
                    {isImg ? (
                      <img
                        src={url}
                        alt={f.name || 'Quote photo'}
                        style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ padding: 16, fontSize: 12, wordBreak: 'break-all' }}>
                        📄 {f.name || url}
                      </div>
                    )}
                    <div style={{ padding: '6px 10px', fontSize: 11, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                      {f.category || 'file'}
                    </div>
                  </a>
                );
              })}
              {attachments.map((attachment, index) => {
                const isImg = isImageUrl(attachment);
                return (
                  <a
                    key={`legacy-${attachment}-${index}`}
                    href={attachment}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#f8fafc',
                      textDecoration: 'none',
                      color: '#0f172a',
                    }}
                  >
                    {isImg ? (
                      <img
                        src={attachment}
                        alt="Attachment"
                        style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ padding: 16, fontSize: 12, wordBreak: 'break-all' }}>
                        📄 {attachment.split('/').pop()}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showSendModal ? (
        <div className="quote-send-overlay" onClick={() => setShowSendModal(false)}>
          <div className="quote-send-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Quote</h3>
            <div className="quote-send-toggle">
              <button
                type="button"
                className={`quote-send-tab ${sendDelivery === 'sms' ? 'is-active' : ''}`}
                onClick={() => setSendDelivery('sms')}
              >
                SMS
              </button>
              <button
                type="button"
                className={`quote-send-tab ${sendDelivery === 'email' ? 'is-active' : ''}`}
                onClick={() => setSendDelivery('email')}
              >
                Email
              </button>
            </div>
            {sendDelivery === 'sms' ? (
              <label className="quote-send-field">
                <span>Phone number</span>
                <input
                  type="tel"
                  value={sendPhone}
                  onChange={(e) => setSendPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </label>
            ) : (
              <label className="quote-send-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </label>
            )}
            <div className="quote-send-actions">
              <Button variant="ghost" onClick={() => setShowSendModal(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleSend}
                disabled={sendDelivery === 'sms' ? !sendPhone.trim() : !sendEmail.trim()}
              >
                Send via {sendDelivery === 'sms' ? 'SMS' : 'Email'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
