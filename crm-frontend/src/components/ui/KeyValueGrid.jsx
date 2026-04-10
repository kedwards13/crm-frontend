import React, { useMemo, useState } from "react";
import clsx from "clsx";
import "./KeyValueGrid.css";

const isPlainObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

const formatScalar = (value) => {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value.trim() || "—";
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const summarize = (value) => {
  if (Array.isArray(value)) return value.length ? `[${value.length} items]` : "[]";
  if (isPlainObject(value)) return Object.keys(value).length ? `{${Object.keys(value).length} keys}` : "{}";
  return formatScalar(value);
};

function Row({ k, v }) {
  const [open, setOpen] = useState(false);

  const expandable = Array.isArray(v) || isPlainObject(v);
  return (
    <div className="kv-row">
      <div className="kv-key">{k}</div>
      <div className="kv-value">
        {!expandable ? (
          <span className="kv-scalar">{formatScalar(v)}</span>
        ) : (
          <button
            type="button"
            className={clsx("kv-toggle", open && "is-open")}
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
          >
            {summarize(v)}
          </button>
        )}
        {expandable && open ? (
          <pre className="kv-pre">{JSON.stringify(v, null, 2)}</pre>
        ) : null}
      </div>
    </div>
  );
}

export default function KeyValueGrid({ title = "All Fields", data, className = "" }) {
  const entries = useMemo(() => {
    if (!isPlainObject(data)) return [];
    return Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (!entries.length) return null;

  return (
    <section className={clsx("kv", className)}>
      {title ? <h4 className="kv-title">{title}</h4> : null}
      <div className="kv-grid">
        {entries.map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </div>
    </section>
  );
}
