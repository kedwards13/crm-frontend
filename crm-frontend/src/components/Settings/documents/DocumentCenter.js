import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../apiClient';
import '../SettingsCommon.css';

const CATEGORIES = [
  { value: 'contract', label: 'Contracts' },
  { value: 'service_doc', label: 'Service Docs' },
  { value: 'knowledge_base', label: 'Knowledge Base' },
  { value: 'sop', label: 'SOPs' },
];

const toRows = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

const readName = (file) => file?.name || file?.original_name || file?.file_name || 'Document';

const matchesQuery = (file, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return `${readName(file)} ${file.category || ''} ${file.upload_status || ''}`
    .toLowerCase()
    .includes(q);
};

export default function DocumentCenter() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [customerId, setCustomerId] = useState('');

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = customerId.trim() ? { customer: customerId.trim() } : undefined;
      const { data } = await api.get('/storage/files/', { params });
      setFiles(toRows(data));
    } catch (err) {
      setError(err?.message || 'Unable to load document center.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const upload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      if (customerId.trim()) formData.append('customer', customerId.trim());

      await api.post('/storage/files/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedFile(null);
      await loadFiles();
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const visibleFiles = useMemo(
    () => files.filter((file) => matchesQuery(file, query.trim())),
    [files, query]
  );

  return (
    <div className='settings-page'>
      <h2>Document Center</h2>
      <p className='settings-sub'>
        Upload contracts, service documentation, SOPs, and knowledge files for AI retrieval and team access.
      </p>
      {error ? <p className='settings-msg error'>{error}</p> : null}

      <div className='settings-card two-col'>
        <label>
          Document Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Linked Customer ID (optional)
          <input
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            placeholder='Customer ID'
          />
        </label>
        <label>
          Search Documents
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search by name, category, or status'
          />
        </label>
        <label>
          Upload File
          <input type='file' onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
        </label>
      </div>

      <div className='settings-inline-actions'>
        <button type='button' className='settings-primary' onClick={upload} disabled={!selectedFile || uploading}>
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
        <button type='button' className='settings-secondary' onClick={loadFiles} disabled={loading}>
          Refresh List
        </button>
      </div>

      <div className='settings-card'>
        <h3>Indexed Documents</h3>
        {loading ? <p>Loading files…</p> : null}
        {!loading && !visibleFiles.length ? <p>No files found.</p> : null}
        {!loading && visibleFiles.length ? (
          <div className='settings-list-grid'>
            {visibleFiles.map((file) => (
              <article key={file.file_uuid || file.id} className='settings-document-item'>
                <div>
                  <strong>{readName(file)}</strong>
                  <p>
                    {file.category || 'document'} • {file.upload_status || 'indexed'}
                  </p>
                </div>
                <div className='settings-doc-meta'>
                  <span>{new Date(file.created_at || Date.now()).toLocaleString()}</span>
                  {file.url ? (
                    <a href={file.url} target='_blank' rel='noreferrer'>
                      Open
                    </a>
                  ) : (
                    <span>Unavailable</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

