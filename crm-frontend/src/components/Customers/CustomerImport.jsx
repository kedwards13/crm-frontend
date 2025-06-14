import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../App';
import './CustomerImport.css';

const CustomerImport = () => {
  // Workflow steps: "upload" → "preview" → "final"
  const [step, setStep] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [mappingOverride, setMappingOverride] = useState("");
  const [summary, setSummary] = useState(null);
  const { token } = useContext(AuthContext);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Clear any existing state on new selection
      setError(null);
      setPreviewData(null);
      setSummary(null);
      setUploadProgress(0);
      setMappingOverride("");
      setStep("upload");
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setPreviewData(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      // Set preview flag to true
      formData.append('preview', 'true');

      const previewUrl = 'http://localhost:808/api/customers/import/preview/';
      const response = await axios.post(previewUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // Set preview data and transition to the preview step.
      setPreviewData(response.data.summary);
      setStep("preview");
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.response?.data?.error || 'An error occurred during preview.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFinalImport = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      // For final import, preview flag is false.
      formData.append('preview', 'false');
      if (mappingOverride.trim()) {
        formData.append('mapping_override', mappingOverride.trim());
      }

      const finalImportUrl = 'http://localhost:808/api/customers/import/execute/';
      const response = await axios.post(finalImportUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      setSummary(response.data.summary);
      setStep("final");
    } catch (err) {
      console.error('Final import error:', err);
      setError(err.response?.data?.error || 'An error occurred during final import.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const renderUploadStep = () => (
    <div className="upload-section">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <button onClick={handlePreview} disabled={!selectedFile || isLoading}>
        {isLoading ? 'Processing Preview...' : 'Preview Import'}
      </button>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="preview-section">
      <h3>Mapping Preview & Sample Data</h3>
      {previewData ? (
        <>
          <div>
            <h4>AI Generated Mapping:</h4>
            <pre>{JSON.stringify(previewData.mapping_used, null, 2)}</pre>
          </div>
          <div>
            <h4>Sample Preview Rows:</h4>
            <pre>{JSON.stringify(previewData.preview_rows, null, 2)}</pre>
          </div>
        </>
      ) : (
        <p>No preview data available.</p>
      )}
      <div>
        <label>
          Adjust Mapping (JSON format):
          <textarea
            rows="10"
            cols="50"
            value={mappingOverride}
            onChange={(e) => setMappingOverride(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleFinalImport} disabled={isLoading}>
        {isLoading ? 'Importing...' : 'Confirm and Finalize Import'}
      </button>
    </div>
  );

  const renderFinalStep = () => (
    <div className="results-section">
      <h3>Import Results</h3>
      {summary ? (
        <div>
          <p>Created: {summary.created}</p>
          <p>Skipped: {summary.skipped}</p>
          {summary.errors && summary.errors.length > 0 && (
            <div className="error-list">
              <h4>Errors:</h4>
              <ul>
                {summary.errors.map((errMsg, idx) => (
                  <li key={idx}>{errMsg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p>No summary available.</p>
      )}
    </div>
  );

  return (
    <div className="import-container ai-single-step">
      <h2>AI CSV Import</h2>
      {step === "upload" && renderUploadStep()}
      {uploadProgress > 0 && (
        <div className="upload-progress">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      {step === "preview" && renderPreviewStep()}
      {step === "final" && renderFinalStep()}
    </div>
  );
};

export default CustomerImport;