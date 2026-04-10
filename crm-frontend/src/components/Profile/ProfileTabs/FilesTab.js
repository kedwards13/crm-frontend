import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";

const toRows = (value) => (Array.isArray(value) ? value : []);

const clean = (value) => String(value || "").trim();

const formatDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

export default function FilesTab({ record }) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const customerPk = useMemo(
    () => (record?.object === "customer" && record?.raw?.id ? record.raw.id : null),
    [record]
  );

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const params = customerPk ? { customer: customerPk } : undefined;
    const rows = await api
      .get("/storage/files/", { params })
      .then((res) => toRows(res.data))
      .catch(() => []);
    setFiles(rows);
    setLoading(false);
  }, [customerPk]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const upload = async () => {
    if (!selectedFile) return;
    const form = new FormData();
    form.append("file", selectedFile);
    form.append("category", "document");
    if (customerPk) form.append("customer", String(customerPk));

    setUploading(true);
    try {
      await api.post("/storage/files/upload/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedFile(null);
      await loadFiles();
    } catch {
      // Keep UI stable; list refresh will show eventual consistency.
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 12,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Upload File</div>
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 10 }}
        />
        <div>
          <button
            type="button"
            disabled={!selectedFile || uploading}
            onClick={upload}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-panel)",
              color: "var(--text-main)",
              cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Files</div>
        {loading ? <div>Loading files...</div> : null}
        {!loading && !files.length ? (
          <div>No files found for this profile in `/api/storage/files/`.</div>
        ) : null}
        {!loading &&
          files.map((file) => (
            <div
              key={file.file_uuid || file.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 10,
                marginBottom: 8,
                background: "var(--bg-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{clean(file.name) || "File"}</strong>
                <span style={{ color: "var(--text-sub)", fontSize: 12 }}>
                  {formatDate(file.created_at)}
                </span>
              </div>
              <div style={{ marginTop: 6, color: "var(--text-sub)", fontSize: 12 }}>
                {clean(file.category) || "document"} • {clean(file.upload_status) || "unknown"}
              </div>
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 8 }}
                >
                  Open File
                </a>
              ) : null}
            </div>
          ))}
      </div>
    </div>
  );
}
