// @ts-nocheck
import React, { useMemo, useState } from 'react';

function splitBatchInput(rawValue: string): string[] {
  return rawValue
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function TagInput({
  values = [],
  onChange,
  label,
  placeholder,
  helperText,
  validate,
  normalize,
  addButtonText = 'Add',
  emptyLabel = 'No values added yet.',
}) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const normalizedValues = useMemo(() => {
    if (!Array.isArray(values)) return [];
    return values.filter((value) => typeof value === 'string' && value.trim().length > 0);
  }, [values]);

  const normalizeValue = (value) => {
    if (typeof normalize === 'function') return normalize(value);
    return value.trim();
  };

  const pushValues = (rawValues) => {
    const incoming = Array.isArray(rawValues) ? rawValues : [rawValues];
    const nextValues = [...normalizedValues];

    for (const raw of incoming) {
      const candidate = normalizeValue(String(raw || ''));
      if (!candidate) continue;

      if (typeof validate === 'function') {
        const result = validate(candidate);
        if (result !== true) {
          setError(typeof result === 'string' ? result : `Invalid value: ${candidate}`);
          return;
        }
      }

      if (!nextValues.includes(candidate)) nextValues.push(candidate);
    }

    setError('');
    onChange(nextValues);
  };

  const removeValue = (itemToRemove) => {
    onChange(normalizedValues.filter((item) => item !== itemToRemove));
  };

  const commitInput = () => {
    const raw = inputValue.trim();
    if (!raw) return;
    pushValues(splitBatchInput(raw));
    setInputValue('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitInput();
    }

    if (event.key === 'Backspace' && !inputValue && normalizedValues.length > 0) {
      removeValue(normalizedValues[normalizedValues.length - 1]);
    }
  };

  const onPaste = (event) => {
    const pastedText = event.clipboardData?.getData('text') || '';
    if (!/[\n,;]/.test(pastedText)) return;

    event.preventDefault();
    pushValues(splitBatchInput(pastedText));
    setInputValue('');
  };

  return (
    <div className="tenant-settings-field">
      {label ? <label className="tenant-settings-label">{label}</label> : null}

      <div className="tenant-tag-input-shell">
        <div className="tenant-tag-list" role="list" aria-label={label || 'Tags'}>
          {normalizedValues.length === 0 ? (
            <span className="tenant-tag-empty">{emptyLabel}</span>
          ) : (
            normalizedValues.map((item) => (
              <span key={item} role="listitem" className="tenant-tag-chip">
                <span className="tenant-tag-chip-value">{item}</span>
                <button
                  type="button"
                  className="tenant-tag-chip-remove"
                  onClick={() => removeValue(item)}
                  aria-label={`Remove ${item}`}
                >
                  x
                </button>
              </span>
            ))
          )}
        </div>

        <div className="tenant-tag-controls">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            className="tenant-tag-input"
            placeholder={placeholder || 'Type value and press Enter'}
          />
          <button type="button" className="tenant-btn tenant-btn-secondary" onClick={commitInput}>
            {addButtonText}
          </button>
        </div>
      </div>

      {helperText ? <p className="tenant-settings-helper">{helperText}</p> : null}
      {error ? <p className="tenant-settings-error">{error}</p> : null}
    </div>
  );
}
