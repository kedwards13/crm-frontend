// src/profiles/ContractsTab.js
import React, { useState, useEffect } from 'react';
import ContractViewer from '../../Contracts/ContractViewer';
import ContractEditorModal from '../../Contracts/ContractEditorModal';
import './ContractsTab.css';
import {
  fetchDocuments,
  fetchSignatures,
  generatePdf
}  from '../../../api/contractsApi';

const ContractsTab = ({ lead }) => {
  const [docs, setDocs] = useState([]);
  const [sigs, setSigs] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const token = localStorage.getItem('token');

  const reload = async () => {
    try {
      const [documents, signatures] = await Promise.all([
        fetchDocuments(lead.id, token),
        fetchSignatures(lead.id, token)
      ]);
      setDocs(documents);
      setSigs(signatures);
    } catch (err) {
      console.error('Error loading contracts data:', err);
      setDocs([]);
      setSigs([]);
    }
  };

  useEffect(() => {
    if (lead?.id) reload();
  }, [lead, token]);

  const isSigned = docType =>
    sigs.some(sig => sig.agreement_type === docType);

  const handleContractCreated = async (contract) => {
    try {
      // Generate the PDF from the token endpoint
      await generatePdf(contract.contract_token, token);
      await reload();

      // Auto-open the newly created contract document
      const created = docs.find(d =>
        d.doc_type === 'contract' &&
        d.file_url.includes(contract.contract_token)
      );
      if (created) {
        setActiveDocId(created.id);
      }
    } catch (err) {
      console.error('Failed to generate or reload:', err);
      alert('Error generating PDF or reloading documents.');
    }
  };

  return (
    <div className="contracts-tab">
      <div className="tab-header">
        <h4>📑 Seller Documents</h4>
        <button className="generate-btn" onClick={() => setShowEditor(true)}>
          ➕ Generate New Contract
        </button>
      </div>

      {docs.length === 0 ? (
        <p>No documents uploaded yet for this lead.</p>
      ) : (
        docs.map(doc => (
          <div key={doc.id} className="contract-card">
            <div className="contract-meta">
              <strong>
                {doc.doc_type === 'contract'
                  ? 'Seller Contract'
                  : doc.doc_type.charAt(0).toUpperCase() + doc.doc_type.slice(1)}
              </strong>
              <p>Uploaded by: <em>{doc.uploaded_by}</em></p>
              <p>On: <em>{new Date(doc.uploaded_at).toLocaleString()}</em></p>
              <p>Status: {isSigned(doc.doc_type) ? '✅ Signed' : '❌ Not Signed'}</p>
            </div>
            <div className="contract-actions">
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                📄 Download
              </a>
              <button onClick={() => setActiveDocId(doc.id)}>
                🔍 Preview
              </button>
            </div>
          </div>
        ))
      )}

      {activeDocId && (
        <ContractViewer
          documentId={activeDocId}
          onClose={() => setActiveDocId(null)}
        />
      )}

      {showEditor && (
        <ContractEditorModal
          leadId={lead.id}
          onClose={() => setShowEditor(false)}
          onSave={handleContractCreated}
        />
      )}
    </div>
  );
};

export default ContractsTab;