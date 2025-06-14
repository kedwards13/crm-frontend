import React, { useState, useEffect } from 'react';
import './ImportDashboard.css';

function ImportDashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [stagingLeads, setStagingLeads] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null); // To store selected lead's details

  // Handle File Selection
  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  // Handle File Upload
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/lead-gen/upload-file/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setStagingLeads(data.staging_leads || []);
      setUploadErrors(data.errors || []);
      setShowPopup(true);
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    }
  };

  // Fetch Staging Leads on Mount
  useEffect(() => {
    const fetchStagingLeads = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/lead-gen/staging-leads/');
        const data = await response.json();
        setStagingLeads(data);
      } catch (error) {
        console.error('Error fetching staging leads:', error);
      }
    };

    fetchStagingLeads();
  }, []);

  // Handle click on a lead card to view the full details
  const handleCardClick = (lead) => {
    setSelectedLead(lead);
    setShowPopup(true); // Show the popup with detailed lead information
  };

  return (
    <div className="import-dashboard">
      <h2>Import Staging Leads</h2>

      <div className="file-upload-section">
        <input type="file" onChange={handleFileChange} accept=".xlsx, .csv" />
        <button onClick={handleUpload}>Upload File</button>
      </div>

      {showPopup && selectedLead === null && (
        <div className="popup-window">
          <h3>Uploaded Staging Leads</h3>
          <button className="close-btn" onClick={() => setShowPopup(false)}>
            Close
          </button>
          <div className="card-grid">
            {stagingLeads.map((lead, index) => (
              <div key={index} className="card" onClick={() => handleCardClick(lead)}>
                <h4>{lead.address}</h4>
                <p>{lead.name || 'N/A'}</p>
                <p>{lead.phone_number || 'N/A'}</p>
                <p>{lead.marketing_list || 'N/A'}</p>
              </div>
            ))}
          </div>

          {uploadErrors.length > 0 && (
            <div className="upload-errors">
              <h4>Upload Errors</h4>
              <ul>
                {uploadErrors.map((error, index) => (
                  <li key={index}>
                    Row {error.row}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selectedLead && showPopup && (
        <div className="popup-window">
          <h3>Lead Details</h3>
          <button className="close-btn" onClick={() => setShowPopup(false)}>
            Close
          </button>
          <div>
            <h4>Property Address:</h4>
            <p>{selectedLead.address}</p>
            <h4>Owner Name:</h4>
            <p>{selectedLead.name || 'N/A'}</p>
            <h4>Phone Numbers:</h4>
            <p>{selectedLead.phone_number || 'N/A'}</p>
            <h4>Lead Source:</h4>
            <p>{selectedLead.marketing_list || 'N/A'}</p>
            {/* Add more fields as required */}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportDashboard;