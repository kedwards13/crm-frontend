import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../apiClient';
import aiApi from '../../aiApiClient';
import { AuthContext } from '../../App';
import {
  FilePlus, RotateCcw, Upload, Save,
  FileText, User, ListChecks, ClipboardList, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import './Scanner.css';
import { createRevivalCampaignDraft } from './campaignDrafts';

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const HODGES_TEMPLATE = 'hodges_delivery_ticket';
const RETRYABLE_ERROR_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK']);
const TRANSIENT_SCAN_FIELDS = new Set([
  'field_confidence',
  'manual_review_fields',
  'extraction_warnings',
  'warnings',
  'detected_template',
  'template',
  'confidence_score',
  'rows_extracted',
  'rows_rejected',
  'rejected_rows',
  'detected_tables',
  'scanner_version',
  'document_id',
  'scan_id',
  'formatted_address',
  'service_type_raw',
  'quote_status_raw',
  'used_raw_text_fallback',
]);

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableRequestError = (error) => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || '').toUpperCase();
  return !status || status >= 500 || RETRYABLE_ERROR_CODES.has(code);
};

const runWithRetry = async (task, retries = 0, retryDelayMs = 300) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableRequestError(error)) {
        throw error;
      }
      await sleep(retryDelayMs);
    }
  }

  throw lastError;
};

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

function splitCustomerName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return ['', ''];
  if (parts.length === 1) return [parts[0], ''];
  return [parts[0], parts.slice(1).join(' ')];
}

function isHodgesTicketText(rawText = '') {
  return /hodges landscaping|delivery ticket\s*\/?\s*invoice/i.test(String(rawText || ''));
}

function formatConfidencePercent(value) {
  const normalized = Number(value || 0);
  return `${Math.round(normalized * 100)}%`;
}

function getConfidenceTone(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return '';
  if (normalized < LOW_CONFIDENCE_THRESHOLD) return 'low';
  if (normalized < 0.85) return 'medium';
  return 'high';
}

function formatTemplateLabel(template) {
  return String(template || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTrailingLocation(address, city, state, zipCode) {
  const normalizedAddress = String(address || '').trim();
  if (!normalizedAddress) return '';

  const parts = [city, state, zipCode].map((value) => String(value || '').trim()).filter(Boolean);
  if (!parts.length) return normalizedAddress;

  const cityPart = city ? `${escapeRegExp(city)}(?:,)?` : '';
  const statePart = state ? `${escapeRegExp(state)}` : '';
  const zipPart = zipCode ? `(?:\\s+${escapeRegExp(zipCode)})?` : '';
  const suffix = [cityPart, statePart].filter(Boolean).join('\\s+');
  if (!suffix) return normalizedAddress;

  return normalizedAddress.replace(new RegExp(`\\s*,?${suffix}${zipPart}$`, 'i'), '').trim() || normalizedAddress;
}

function getConfidenceKey(fieldName) {
  if (['customer_first_name', 'customer_last_name', 'customer_name'].includes(fieldName)) return 'name_confidence';
  if (['customer_phone'].includes(fieldName)) return 'phone_confidence';
  if (['address', 'city', 'state', 'zip_code'].includes(fieldName)) return 'address_confidence';
  return '';
}

export default function Scanner() {
  const navigate = useNavigate();
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
  const [scanReview, setScanReview] = useState(null);

  const email = user?.email || safeParse(localStorage.getItem('user'))?.email;
  const domain = tenant?.domain || safeParse(localStorage.getItem('activeTenant'))?.domain;

  useEffect(() => {
    if (formData?.line_items?.length) setLineItems(formData.line_items);
  }, [formData]);

  const fetchRecentScans = async () => {
    try {
      const res = await api.get('/revival/scanner/recent/', { params: { limit: 10 } });
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
      unit_price: item.unit_price === null || item.unit_price === undefined || item.unit_price === '' ? '' : parseFloat(item.unit_price) || 0,
      total_price:
        parseFloat(item.total_price) ||
        ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)),
      category: item.category || '',
    }));

  const calculateTotal = (items = lineItems) =>
    items.reduce((acc, item) => {
      const total = parseFloat(item.total_price);
      if (!isNaN(total) && total > 0) return acc + total;
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unit_price);
      return acc + (isNaN(qty) || isNaN(price) ? 0 : qty * price);
    }, 0);

  const finalizeStructuredData = (structured = {}, rawText = '') => {
    const fallbackName = structured.customer_name || '';
    const [derivedFirst, derivedLast] = splitCustomerName(fallbackName);
    const normalizedItems = normalizeLineItems(structured.line_items || []);
    const nextStructured = {
      ...structured,
      customer_first_name: structured.customer_first_name || structured.first_name || derivedFirst,
      customer_last_name: structured.customer_last_name || structured.last_name || derivedLast,
      customer_phone: structured.customer_phone || structured.phone || '',
      phone: structured.phone || structured.customer_phone || '',
      line_items: normalizedItems,
      estimated_total:
        Number(structured.estimated_total ?? structured.total) || calculateTotal(normalizedItems),
      raw_text: rawText,
    };

    return { nextStructured, normalizedItems };
  };

  const buildReviewState = (payload = {}, fallbackTemplate = '') => ({
    detected_template: payload.detected_template || payload.template || fallbackTemplate || 'generic',
    confidence_score:
      Number(payload.confidence_score ?? payload?.field_confidence?.overall ?? payload.ai_confidence ?? 0) || 0,
    field_confidence: payload.field_confidence || {},
    manual_review_fields: payload.manual_review_fields || [],
    needs_review: true,
    extraction_warnings: payload.extraction_warnings || payload.warnings || ['ocr_parsing_incomplete'],
  });

  const extractData = async (base64) => {
    if (!email || !domain) return toast.error('Unauthorized');
    const scanToastId = toast.loading('Scanning document with AI...');
    setScanning(true);
    setSaved(false);
    setScanReview(null);
    try {
      // CRM web matches mobile here: OCR failures should degrade into editable review, not dump the
      // operator out of the scanner after they've already uploaded the document.
      const res = await runWithRetry(
        () =>
          aiApi.post(
            '/scan/quote/',
            {
              image: base64,
              tenant_id: domain,
              user_id: email,
              save_to_crm: false,
            },
            {
              timeout: 20000,
            }
          ),
        2
      );
      const { structured = {}, raw_text } = res.data;
      const rawText = String(raw_text || '');
      let nextStructured = { ...structured };
      let nextReview = null;

      if (isHodgesTicketText(rawText)) {
        try {
          const parsedResponse = await runWithRetry(
            () =>
              api.post(
                '/revival/scanner/parse/',
                {
                  source: 'revival_scanner',
                  raw_text: rawText,
                  image_base64: base64,
                  customer_name: structured.customer_name || '',
                  customer_phone: structured.customer_phone || structured.phone || '',
                  address: structured.address || '',
                  city: structured.city || '',
                  state: structured.state || '',
                  zip_code: structured.zip_code || '',
                  service_type: structured.service_type || '',
                  estimated_total: structured.estimated_total || structured.total || 0,
                  total: structured.total || structured.estimated_total || 0,
                  line_items: structured.line_items || [],
                  intake_attributes: {
                    raw_text_preview: rawText,
                  },
                },
                {
                  timeout: 20000,
                }
              ),
            2
          );
          const parsed = parsedResponse?.data || {};
          const mergedName = parsed.customer_name || nextStructured.customer_name || '';
          const [derivedFirst, derivedLast] = splitCustomerName(mergedName);
          const normalizedItems = normalizeLineItems(parsed.line_items || nextStructured.line_items || []);
          const strippedAddress = stripTrailingLocation(
            parsed.address || nextStructured.address || '',
            parsed.city || nextStructured.city || '',
            parsed.state || nextStructured.state || '',
            parsed.zip_code || nextStructured.zip_code || ''
          );
          nextStructured = {
            ...nextStructured,
            ...parsed,
            customer_name: mergedName,
            customer_first_name: parsed.first_name || nextStructured.customer_first_name || derivedFirst,
            customer_last_name: parsed.last_name || nextStructured.customer_last_name || derivedLast,
            customer_phone: parsed.phone || nextStructured.customer_phone || nextStructured.phone || '',
            phone: parsed.phone || nextStructured.phone || nextStructured.customer_phone || '',
            address: strippedAddress || parsed.address || nextStructured.address || '',
            city: parsed.city || nextStructured.city || '',
            state: parsed.state || nextStructured.state || '',
            zip_code: parsed.zip_code || nextStructured.zip_code || '',
            line_items: normalizedItems,
            estimated_total: Number(parsed.estimated_total ?? parsed.total) || calculateTotal(normalizedItems),
            raw_text: rawText,
            ai_confidence: Number(parsed.confidence_score ?? parsed?.confidence?.overall ?? nextStructured.ai_confidence ?? 0) || 0,
            needs_review: Boolean(parsed.needs_review),
            detected_template: parsed.detected_template || parsed.template || HODGES_TEMPLATE,
          };
          nextReview = {
            detected_template: parsed.detected_template || parsed.template || HODGES_TEMPLATE,
            confidence_score: Number(parsed.confidence_score ?? parsed?.field_confidence?.overall ?? 0) || 0,
            field_confidence: parsed.field_confidence || {},
            manual_review_fields: parsed.manual_review_fields || [],
            needs_review: Boolean(parsed.needs_review),
            extraction_warnings: parsed.extraction_warnings || [],
          };
        } catch (parseErr) {
          console.error('[⚠️ Hodges Parse Error]', parseErr);
          const partial = parseErr?.response?.data;
          if (partial && typeof partial === 'object') {
            const mergedName = partial.customer_name || nextStructured.customer_name || '';
            const [derivedFirst, derivedLast] = splitCustomerName(mergedName);
            const normalizedItems = normalizeLineItems(partial.line_items || nextStructured.line_items || []);
            const strippedAddress = stripTrailingLocation(
              partial.address || nextStructured.address || '',
              partial.city || nextStructured.city || '',
              partial.state || nextStructured.state || '',
              partial.zip_code || nextStructured.zip_code || ''
            );
            nextStructured = {
              ...nextStructured,
              ...partial,
              customer_name: mergedName,
              customer_first_name: partial.first_name || nextStructured.customer_first_name || derivedFirst,
              customer_last_name: partial.last_name || nextStructured.customer_last_name || derivedLast,
              customer_phone: partial.phone || nextStructured.customer_phone || nextStructured.phone || '',
              phone: partial.phone || nextStructured.phone || nextStructured.customer_phone || '',
              address: strippedAddress || partial.address || nextStructured.address || '',
              city: partial.city || nextStructured.city || '',
              state: partial.state || nextStructured.state || '',
              zip_code: partial.zip_code || nextStructured.zip_code || '',
              line_items: normalizedItems,
              estimated_total: Number(partial.estimated_total ?? partial.total) || calculateTotal(normalizedItems),
              raw_text: rawText,
              ai_confidence:
                Number(partial.confidence_score ?? partial?.confidence?.overall ?? nextStructured.ai_confidence ?? 0) || 0,
              needs_review: true,
              detected_template: partial.detected_template || partial.template || HODGES_TEMPLATE,
            };
            nextReview = buildReviewState(partial, HODGES_TEMPLATE);
          }
        }
      }

      const { nextStructured: normalizedStructured, normalizedItems } = finalizeStructuredData(nextStructured, rawText);
      nextStructured = normalizedStructured;

      setFormData(nextStructured);
      setLineItems(normalizedItems);
      setScanReview(nextReview);
      setResult({ raw_text: rawText });
      toast.update(scanToastId, {
        render: nextReview?.needs_review
          ? 'Hodges ticket parsed. Review highlighted fields before saving.'
          : nextReview
            ? 'Hodges ticket parsed successfully.'
            : 'AI extraction successful.',
        type: 'success',
        isLoading: false,
        autoClose: 2500,
      });
    } catch (err) {
      console.error('[❌ AI Extraction Error]', err);
      const payload = err?.response?.data;
      const rawText = String(payload?.raw_text || payload?.ocr_text || '');
      const partialStructured =
        payload?.structured && typeof payload.structured === 'object'
          ? payload.structured
          : payload && typeof payload === 'object'
          ? payload
          : {};
      const fallbackTemplate =
        partialStructured.detected_template ||
        partialStructured.template ||
        (isHodgesTicketText(rawText) ? HODGES_TEMPLATE : 'generic');
      const { nextStructured, normalizedItems } = finalizeStructuredData(
        {
          ...partialStructured,
          needs_review: true,
        },
        rawText
      );
      setFormData(nextStructured);
      setLineItems(normalizedItems);
      setScanReview(buildReviewState(partialStructured, fallbackTemplate));
      setResult({ raw_text: rawText });
      toast.update(scanToastId, {
        render: 'Partial extraction loaded. Review the fields before saving.',
        type: 'warning',
        isLoading: false,
        autoClose: 3200,
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
    if (key === 'customer_name') {
      const [firstName, lastName] = splitCustomerName(value);
      updated.customer_first_name = firstName;
      updated.customer_last_name = lastName;
    }
    if (key === 'customer_first_name' || key === 'customer_last_name') {
      updated.customer_name = [updated.customer_first_name, updated.customer_last_name].filter(Boolean).join(' ').trim();
    }
    setFormData(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    const item = updated[index];
    item[field] = value;
    if (field === 'total_price') {
      item.total_price = parseFloat(value) || 0;
    } else if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unit_price);
      if (!isNaN(qty) && !isNaN(price)) {
        item.total_price = qty * price;
      } else {
        item.total_price = parseFloat(item.total_price) || 0;
      }
    }
    setLineItems([...updated]);
    setFormData((prev) => ({
      ...prev,
      line_items: updated,
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
      const cleanedFormData = Object.entries(formData || {}).reduce((acc, [key, value]) => {
        if (!TRANSIENT_SCAN_FIELDS.has(key) && key !== 'id') acc[key] = value;
        return acc;
      }, {});
      const [derivedFirst, derivedLast] = splitCustomerName(cleanedFormData.customer_name);
      const hodgesDetected = scanReview?.detected_template === HODGES_TEMPLATE;
      const payload = {
        ...cleanedFormData,
        tenant_id: tenant?.domain,
        user_id: user?.email,
        customer_first_name: cleanedFormData.customer_first_name || derivedFirst,
        customer_last_name: cleanedFormData.customer_last_name || derivedLast,
        customer_phone: cleanedFormData.customer_phone || cleanedFormData.phone || '',
        raw_text: result?.raw_text || cleanedFormData.raw_text || '',
        line_items: normalizeLineItems(lineItems),
        estimated_total: calculateTotal(lineItems),
        quote_date: formatDateForBackend(formData.quote_date),
        ai_confidence: scanReview?.confidence_score ?? cleanedFormData.ai_confidence ?? null,
        needs_review: Boolean(scanReview?.needs_review ?? cleanedFormData.needs_review),
        source: manualMode ? 'manual' : hodgesDetected ? 'revival_scanner' : 'scanner',
      };
      const response = await api.post('/revival/scanner/save/', payload);
      const savedQuote = response?.data || {};
      setFormData((prev) => ({
        ...prev,
        ...savedQuote,
      }));
      toast.success('✅ Quote saved to CRM!');
      setSaved(true);
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
    setBase64Image(null);
    setResult(null);
    setScanReview(null);
    setSaved(false);
  };

  const exportPDF = async () => {
    const quoteId = String(formData?.id || formData?.quote_id || '').trim();
    if (!quoteId) {
      toast.error('Save the quote first, then export PDF.');
      return;
    }
    try {
      const res = await api.get(`/revival/${quoteId}/export-pdf/`, { responseType: 'blob' });
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

  const handleCreateCampaignDraft = async (quote) => {
    const quoteId = String(quote?.id || quote?.quote_id || '').trim();
    if (!quoteId) {
      toast.error('Save the quote first, then create a campaign draft.');
      return;
    }
    try {
      const { data } = await createRevivalCampaignDraft({
        quotes: [quote],
        name: `Revival - ${quote.customer_name || 'Customer'}`,
      });
      navigate('/revival/campaigns', {
        state: {
          campaignId: data?.id,
          createdCampaignId: data?.id,
          seedQuotes: [quote],
        },
      });
    } catch (err) {
      toast.error(`Campaign draft failed: ${err?.message || 'unknown error'}`);
    }
  };

  const runRevivalTrigger = async () => {
    const runToastId = toast.loading('Running revival trigger...');
    try {
      const res = await api.post('/revival/trigger/', {});
      const payload = res?.data || {};
      const sent = Number(payload.sent || payload.sent_count || 0);
      const failed = Number(payload.failed || payload.failed_count || 0);
      toast.update(runToastId, {
        render: `Revival trigger complete: sent ${sent}, failed ${failed}.`,
        type: 'success',
        isLoading: false,
        autoClose: 2600,
      });
    } catch (err) {
      toast.update(runToastId, {
        render: `Revival trigger failed: ${err?.response?.data?.detail || err?.message || 'unknown error'}`,
        type: 'error',
        isLoading: false,
        autoClose: 3200,
      });
    }
  };

  const rescan = () => base64Image && extractData(base64Image);

  const fieldConfidence = scanReview?.field_confidence || {};
  const itemConfidence = Number(fieldConfidence.items_confidence);
  const itemsNeedReview = Number.isFinite(itemConfidence) && itemConfidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="scanner-container" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
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
                  <button
                    type="button"
                    className="recent-scan-campaign-btn"
                    onClick={() => handleCreateCampaignDraft(scan)}
                  >
                    Campaign Draft
                  </button>
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
              <button onClick={runRevivalTrigger}><Upload size={16} /> Run Revival Trigger</button>
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
              {scanReview && (
                <section className={`scanner-review-panel ${scanReview.needs_review ? 'needs-review' : ''}`}>
                  <div className="scanner-review-head">
                    <div>
                      <p className="scanner-review-eyebrow">Scanner Review</p>
                      <h3>{formatTemplateLabel(scanReview.detected_template || HODGES_TEMPLATE)}</h3>
                    </div>
                    <div className="scanner-review-badges">
                      <span className={`confidence-badge ${getConfidenceTone(scanReview.confidence_score)}`}>
                        Overall {formatConfidencePercent(scanReview.confidence_score)}
                      </span>
                      {scanReview.needs_review && (
                        <span className="confidence-badge low">Manual review required</span>
                      )}
                    </div>
                  </div>
                  <div className="scanner-review-grid">
                    <div>
                      <span>Template</span>
                      <strong>{formatTemplateLabel(scanReview.detected_template || HODGES_TEMPLATE)}</strong>
                    </div>
                    <div>
                      <span>Name</span>
                      <strong>{formatConfidencePercent(fieldConfidence.name_confidence)}</strong>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{formatConfidencePercent(fieldConfidence.phone_confidence)}</strong>
                    </div>
                    <div>
                      <span>Address</span>
                      <strong>{formatConfidencePercent(fieldConfidence.address_confidence)}</strong>
                    </div>
                    <div>
                      <span>Line Items</span>
                      <strong>{formatConfidencePercent(fieldConfidence.items_confidence)}</strong>
                    </div>
                  </div>
                  {scanReview.extraction_warnings?.length > 0 && (
                    <ul className="scanner-warning-list">
                      {scanReview.extraction_warnings.map((warning) => (
                        <li key={warning}>{warning.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* Customer Info */}
              <h3><User size={18} /> Customer Information</h3>
              {[
                'customer_first_name', 'customer_last_name', 'customer_name',
                'customer_email', 'customer_phone',
                'address', 'city', 'state', 'zip_code', 'service_type',
              ].map((key) => (
                <div
                  key={key}
                  className={`form-group ${
                    Number(fieldConfidence[getConfidenceKey(key)]) < LOW_CONFIDENCE_THRESHOLD &&
                    scanReview?.manual_review_fields?.includes(getConfidenceKey(key))
                      ? 'has-low-confidence'
                      : ''
                  }`}
                >
                  <label className="form-label-row">
                    <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    {getConfidenceKey(key) && Number.isFinite(Number(fieldConfidence[getConfidenceKey(key)])) && (
                      <span className={`confidence-badge ${getConfidenceTone(fieldConfidence[getConfidenceKey(key)])}`}>
                        {formatConfidencePercent(fieldConfidence[getConfidenceKey(key)])}
                      </span>
                    )}
                  </label>
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
              <div className={`line-items-review-head ${itemsNeedReview ? 'has-low-confidence' : ''}`}>
                <h3><ListChecks size={18} /> Line Items</h3>
                {Number.isFinite(itemConfidence) && (
                  <span className={`confidence-badge ${getConfidenceTone(itemConfidence)}`}>
                    {formatConfidencePercent(itemConfidence)}
                  </span>
                )}
              </div>
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
                    inputMode="decimal"
                    value={item.total_price ?? ''}
                    placeholder="Total"
                    onChange={(e) => handleItemChange(i, 'total_price', e.target.value)}
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
                <button
                  type="button"
                  onClick={() => handleCreateCampaignDraft(formData)}
                  disabled={!String(formData?.id || formData?.quote_id || '').trim()}
                >
                  <Upload size={16} /> Create Campaign Draft
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
