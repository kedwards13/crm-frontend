import React, { useState, useEffect } from 'react';
import './ContractViewer.css'; // Optional scoped styling

const ContractViewer = ({ contractToken, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contractToken) return;

    const fetchPdf = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:808/api/sellers/contract/${contractToken}/`, {
          headers: {
            Accept: 'application/pdf',
          },
        });

        if (!res.ok) throw new Error('Failed to load PDF');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error(err);
        setError('Could not load contract PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [contractToken]);

  return (
    <div className="contract-viewer-overlay">
      <div className="contract-viewer">
        <div className="viewer-header">
          <h3>📄 Contract Preview</h3>
          <button onClick={onClose}>&times;</button>
        </div>

        {loading && <p className="loading-msg">Loading contract...</p>}
        {error && <p className="error-msg">{error}</p>}

        {pdfUrl && (
          <iframe
            src={pdfUrl}
            title="Contract PDF"
            className="pdf-frame"
          />
        )}

        <div className="viewer-footer">
          {pdfUrl && (
            <a href={pdfUrl} download={`contract_${contractToken}.pdf`} className="download-btn">
              ⬇️ Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractViewer;