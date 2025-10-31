// crm-frontend/src/components/Operations/Inventory/LabelCaptureModal.jsx
import React, { useEffect, useRef } from "react";
import LabelCapture from "./LabelCapture";
import "./Inventory.css";

export default function LabelCaptureModal({ open, onClose, onDraft }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prior; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const onBackdrop = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) onClose?.();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={onBackdrop}>
      <div className="modal-backdrop" />
      <div className="modal-card modal-card--subtle" ref={cardRef} role="document" onMouseDown={(e)=>e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>Close</button>
        <div className="modal-title">
          <h2>Add from Label / Scan</h2>
          <p className="muted">Upload a label photo/PDF or enter a barcode. We’ll prefill the product form.</p>
        </div>
        <LabelCapture onDraft={onDraft} />
      </div>
    </div>
  );
}