import React, { useMemo, useState } from 'react';
import {
  getImportStatus,
  uploadCsv,
} from '../../api/customerImportService';
import './ImportProperties.css';

const statusLabel = (value) => String(value || '').trim() || 'unknown';

function ImportProperties() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [taskId, setTaskId] = useState('');
  const [polling, setPolling] = useState(false);
  const [latestStatus, setLatestStatus] = useState(null);

  const progress = useMemo(
    () =>
      Number(
        latestStatus?.import_job?.progress_percent ??
          latestStatus?.progress_percent ??
          0
      ) || 0,
    [latestStatus]
  );

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleFileUpload = async () => {
    if (!file) {
      setUploadStatus('Select a CSV file first.');
      return;
    }
    setUploadStatus('Uploading and queuing import...');
    try {
      const result = await uploadCsv(file);
      const nextTaskId = String(result?.task_id || '').trim();
      setTaskId(nextTaskId);
      setUploadStatus(nextTaskId ? 'Import queued.' : 'Import request submitted.');
      if (nextTaskId) {
        await handlePoll(nextTaskId);
      }
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        'Upload failed';
      setUploadStatus(String(detail));
    }
  };

  const handlePoll = async (overrideTaskId) => {
    const id = String(overrideTaskId || taskId || '').trim();
    if (!id) {
      setUploadStatus('No task ID available to check status.');
      return;
    }
    setPolling(true);
    try {
      const data = await getImportStatus(id);
      setLatestStatus(data);
      const importStatus = statusLabel(data?.import_job?.status || data?.celery_status);
      setUploadStatus(`Import status: ${importStatus}`);
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        'Unable to fetch import status';
      setUploadStatus(String(detail));
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="import-properties">
      <h2>Import Customers</h2>
      <p>Upload a CSV to `/api/imports/customers/` and track task progress.</p>
      <div className="file-upload">
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload</button>
        <button onClick={() => handlePoll()} disabled={!taskId || polling}>
          {polling ? 'Checking…' : 'Check Status'}
        </button>
      </div>

      {taskId ? <p className="upload-status">Task ID: {taskId}</p> : null}
      {uploadStatus ? <p className="upload-status">{uploadStatus}</p> : null}
      {latestStatus ? (
        <div className="upload-status">
          <div>Celery: {statusLabel(latestStatus.celery_status)}</div>
          <div>Import: {statusLabel(latestStatus?.import_job?.status)}</div>
          <div>Progress: {progress}%</div>
        </div>
      ) : null}
    </div>
  );
}

export default ImportProperties;
