import React, { useState} from 'react';
import './ImportProperties.css'; // Add styles for this component

function ImportProperties() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = () => {
    if (!file) {
      setUploadStatus('Please select a file to upload.');
      return;
    }

    // Mock file upload logic (Replace with actual API call)
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://127.0.0.1:808/api/import-properties/', {
      method: 'POST',
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to upload file');
        return res.json();
      })
      .then(() => {
        setUploadStatus('File uploaded successfully!');
      })
      .catch(() => {
        setUploadStatus('File upload failed. Please try again.');
      });
  };

  return (
    <div className="import-properties">
      <h2>Import Properties</h2>
      <p>Select a file to import property data into the system.</p>
      <div className="file-upload">
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload</button>
      </div>
      {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
    </div>
  );
}

export default ImportProperties;