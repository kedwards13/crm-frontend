import React, { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import { AuthContext } from "../../App";
import "./CustomerImport.css";

const API_BASE = "http://localhost:808/api/imports";

const CRM_FIELDS = [
  "",
  "first_name",
  "last_name",
  "email",
  "phone",
  "address",
  "city",
  "zip_code",
  "county",
  "service_type",
  "policy_type",
  "program_type",
  "frequency",
  "start_date",
  "next_service_date",
  "notes",
  "price",
  "annual_price",
];

export default function CustomerImport() {
  const { token } = useContext(AuthContext);

  const [step, setStep]         = useState("upload");
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState("");
  const [preview, setPreview]   = useState(null);
  const [mapping, setMapping]   = useState({});
  const [finalSummary, setFinal]= useState(null);
  const pollRef = useRef(null);

  // Reset on new file
  useEffect(() => {
    setStep("upload");
    setPreview(null);
    setFinal(null);
    setMapping({});
    setError("");
    setProgress(0);
    if (pollRef.current) clearInterval(pollRef.current);
  }, [file]);

  const onFileChange = e => setFile(e.target.files?.[0] || null);

  // Preview vs execute POST
  const postImport = isPreview => {
    const url = isPreview
      ? `${API_BASE}/customers/?preview=true`
      : `${API_BASE}/customers/`;
    const form = new FormData();
    form.append("file", file);
    if (!isPreview) form.append("mapping_override", JSON.stringify(mapping));
    return axios.post(url, form, {
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: ev =>
        setProgress(Math.round((ev.loaded * 100) / ev.total)),
    });
  };

  // Shake animation on error
  const animateError = () => {
    const c = document.querySelector(".import-container");
    if (!c) return;
    c.classList.add("shake");
    setTimeout(() => c.classList.remove("shake"), 500);
  };

  // 1️⃣ Preview
  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await postImport(true);
      setPreview({
        headers:      data.raw_headers,
        mapping_used: data.mapping_used,
        preview_rows: data.preview_rows,
      });
      setMapping(data.mapping_used || {});
      setStep("preview");
    } catch (err) {
      setError(err.response?.data?.error || "Preview failed");
      animateError();
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // 2️⃣ Execute + Poll
  const handleExecute = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await postImport(false);
      const taskId = data.task_id;

      pollRef.current = setInterval(async () => {
        try {
          const res = await axios.get(
            `${API_BASE}/status/${taskId}/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const { celery_status, import_job } = res.data;

          if (celery_status === "SUCCESS" || import_job?.status === "completed") {
            clearInterval(pollRef.current);
            setFinal(import_job);
            setStep("final");
          }
          if (celery_status === "FAILURE" || import_job?.status === "failed") {
            clearInterval(pollRef.current);
            setError(import_job?.error_message || "Import failed");
            setStep("upload");
            animateError();
          }
        } catch {
          clearInterval(pollRef.current);
          setError("Could not fetch import status");
          setStep("upload");
          animateError();
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Import failed");
      setStep("upload");
      animateError();
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Sort so mapped CRM_FIELDS float left
  const sortedHeaders = () => {
    const cols = [...preview.headers];
    return cols.sort((a, b) => {
      const ia = CRM_FIELDS.indexOf(mapping[a] || a);
      const ib = CRM_FIELDS.indexOf(mapping[b] || b);
      return (ia < 0 ? CRM_FIELDS.length : ia)
           - (ib < 0 ? CRM_FIELDS.length : ib);
    });
  };

  // —– RENDERERS —–
  const renderUpload = () => (
    <div className="card upload-section">
      <h2>1. Upload Your CSV</h2>
      <input type="file"
             accept=".csv"
             onChange={onFileChange}
             disabled={loading}/>
      <button onClick={handlePreview}
              disabled={!file||loading}
              className="btn-primary">
        {loading ? `Uploading… ${progress}%` : "Preview Import"}
      </button>
    </div>
  );

  const renderPreview = () => (
    <div className="card preview-section">
      <h2>2. Adjust Column Mapping</h2>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>CSV Column</th><th>Mapped Field</th></tr></thead>
          <tbody>
            {Object.entries(mapping).map(([col, mapped]) => (
              <tr key={col}>
                <td>{col}</td>
                <td>
                  <select value={mapped}
                          onChange={e=>setMapping(m=>({...m,[col]:e.target.value}))}>
                    {CRM_FIELDS.map(f=>(
                      <option key={f} value={f}>{f||"(no mapping)"}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>3. Data Preview</h2>
      <div className="overflow-auto">
        <table>
          <thead>
            <tr>
              {sortedHeaders().map(c=><th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {preview.preview_rows.map((row,i)=>(
              <tr key={i}>
                {sortedHeaders().map(c=><td key={c}>{row[c]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={handleExecute}
              disabled={loading}
              className="btn-primary">
        {loading ? `Importing… ${progress}%` : "Confirm & Import"}
      </button>
    </div>
  );

  const renderFinal = () => (
    <div className="card results-section">
      <h2>3. Import Complete 🎉</h2>
      <p><strong>Created:</strong> {finalSummary.successful_records}</p>
      <p><strong>Skipped:</strong> {finalSummary.failed_records}</p>
      {finalSummary.error_message && (
        <div className="error-list">
          <h4>Errors</h4>
          <p>{finalSummary.error_message}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="import-container">
      {loading && (
        <div className="spinner-overlay">
          <div className="spinner"/>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      {step==="upload"  && renderUpload()}
      {step==="preview" && renderPreview()}
      {step==="final"   && renderFinal()}
    </div>
  );
}