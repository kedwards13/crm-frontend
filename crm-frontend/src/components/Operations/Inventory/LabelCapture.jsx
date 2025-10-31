// crm-frontend/src/components/Operations/Inventory/LabelCapture.jsx
import React, { useMemo, useRef, useState } from "react";
import useInventoryApi from "./useInventoryApi";
import "./Inventory.css";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];

export default function LabelCapture({ onDraft }) {
  const { ingestLabel } = useInventoryApi();
  const [mode, setMode] = useState("label"); // 'label' | 'barcode'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileMeta, setFileMeta] = useState(null); // { name, size, type }
  const [pdfName, setPdfName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [draft, setDraft] = useState(null); // parsed fields
  const fileRef = useRef(null);

  const isMobile = useMemo(() => /iPhone|Android|iPad/i.test(navigator.userAgent), []);
  const cameraAvailable = useMemo(() => isMobile && window.isSecureContext, [isMobile]);

  const clearFeedback = () => { setErr(""); setInfo(""); };
  const clearSelection = () => {
    setPreviewUrl(""); setPdfName(""); setFileMeta(null); setDraft(null);
    if (fileRef.current) fileRef.current.value = "";
    clearFeedback();
  };

  const validateFile = (file) => {
    if (!file) return "No file selected.";
    if (!ACCEPT.includes(file.type)) return "Only PNG/JPG/PDF are accepted.";
    if (file.size > MAX_BYTES) return "File too large (max ~10MB).";
    return "";
  };

  const normalizeDraft = (d = {}) => ({
    sku: d.sku || "",
    name: d.name || "",
    type: d.type || "consumable",
    uom:  d.uom  || "ea",
    upc:  d.upc  || "",
    vendor: d.vendor ?? d.vendor_id ?? null,
    vendor_name: d.vendor_name || "",
    reorder_min: d.reorder_min ?? "",
    reorder_target: d.reorder_target ?? "",
    is_chemical: !!d.is_chemical,
    requires_lot: !!d.requires_lot,
    requires_expiry: !!d.requires_expiry,
  });

  const handleUpload = async (file) => {
    clearFeedback();
    const v = validateFile(file);
    if (v) return setErr(v);

    setFileMeta({ name: file.name, size: file.size, type: file.type });
    setPreviewUrl(""); setPdfName("");

    if (file.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(file));
    else setPdfName(file.name);

    setBusy(true);
    try {
      const parsed = await ingestLabel(file);
      const d = normalizeDraft(parsed);
      setDraft(d);
      setInfo("Label recognized. Review the parsed fields, then Apply.");
    } catch (e) {
      console.error(e);
      setErr("Couldn’t read that label. Try a clearer photo or PDF.");
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const onSubmitBarcode = (e) => {
    e.preventDefault();
    clearFeedback();
    const code = barcode.trim();
    if (!code) return setErr("Enter a barcode/UPC.");
    const d = normalizeDraft({ upc: code });
    setDraft(d);
    setInfo("UPC captured. Click Apply to prefill the form.");
    setBarcode("");
  };

  const applyDraft = () => {
    if (draft) onDraft?.(draft);
    setInfo("Applied to form. You can edit anything before saving.");
  };

  const fileLabel = fileMeta
    ? `${fileMeta.name} · ${(fileMeta.size / 1024 / 1024).toFixed(1)}MB`
    : pdfName;

  return (
    <div className="inventory-card label-capture" aria-live="polite">
      <div className="label-capture-head">
        <h3>Add from Label / Scan</h3>
        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${mode === "label" ? "is-active" : ""}`}
            onClick={() => { setMode("label"); clearFeedback(); }}
          >
            Upload Label
          </button>
          <button
            type="button"
            className={`seg-btn ${mode === "barcode" ? "is-active" : ""}`}
            onClick={() => { setMode("barcode"); clearFeedback(); }}
          >
            Scan/Enter Barcode
          </button>
        </div>
      </div>

      {mode === "label" && (
        <>
          <p className="muted">Upload a clear label photo or a PDF. We’ll parse and prefill the product form.</p>

          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={onFileChange}
              ref={fileRef}
              disabled={busy}
            />
            <div className="hint">Accepted: PNG/JPG/PDF · Max ~10MB</div>

            {(previewUrl || pdfName) && (
              <div className="preview">
                {previewUrl
                  ? <img src={previewUrl} alt="Label preview" />
                  : <div className="muted">📄 {pdfName}</div>}
              </div>
            )}

            {fileLabel && (
              <div className="file-chip">
                <span title={fileLabel}>{fileLabel}</span>
                <button type="button" onClick={clearSelection} className="chip-x" aria-label="Clear">×</button>
              </div>
            )}
          </div>

          {busy && <div className="muted" style={{ marginTop: 8 }}>Reading label…</div>}
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
          {info && <div className="note"  style={{ marginTop: 8 }}>{info}</div>}
        </>
      )}

      {mode === "barcode" && (
        <>
          {!cameraAvailable && (
            <div className="note" style={{ marginBottom: 8 }}>
              Live camera scanning needs HTTPS on mobile. You can still type or paste a code below.
            </div>
          )}
          <form onSubmit={onSubmitBarcode} className="form-row">
            <input
              placeholder="Enter or scan UPC / EAN / barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <button type="submit" className="btn">Use</button>
          </form>
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
          {info && <div className="note"  style={{ marginTop: 8 }}>{info}</div>}
        </>
      )}

      {/* Parsed summary */}
      {draft && (
        <div className="parsed-panel">
          <div className="parsed-grid">
            <Field k="Name" v={draft.name} />
            <Field k="SKU" v={draft.sku} mono />
            <Field k="UPC" v={draft.upc} mono />
            <Field k="Type" v={draft.type} />
            <Field k="UoM"  v={draft.uom} />
            <Field k="Vendor" v={draft.vendor_name || (draft.vendor ? `#${draft.vendor}` : "")} />
            <Field k="Reorder Min" v={draft.reorder_min} />
            <Field k="Target" v={draft.reorder_target} />
            <Field k="Flags" v={[
              draft.is_chemical && "chemical",
              draft.requires_lot && "lot",
              draft.requires_expiry && "expiry",
            ].filter(Boolean).join(" · ")} />
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={applyDraft}>Apply to Form</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ k, v, mono=false }){
  return (
    <div className="parsed-field">
      <div className="k">{k}</div>
      <div className={`v ${mono ? "mono" : ""}`}>{(v ?? "") === "" ? "—" : String(v)}</div>
    </div>
  );
}