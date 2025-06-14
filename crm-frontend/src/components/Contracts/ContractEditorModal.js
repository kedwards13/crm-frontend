// src/components/Contracts/ContractEditorModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import ContractSteps from './ContractSteps';
import ContractClauseBuilder from './ContractClauseBuilder';
import './ContractEditorModal.css';

const API_BASE = '/api/sellers';
const TOTAL_STEPS = 3;

// helper to blow up on non-2xx
async function checkStatus(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res;
}

const ContractEditorModal = ({
  contractId: initialContractId,
  leadId,
  onClose,
  onSave, // callback receives the created/updated contract { id, contract_token, ... }
}) => {
  const [step, setStep] = useState(0);
  const [contractId, setContractId] = useState(initialContractId || null);
  const [contractToken, setContractToken] = useState(null); // <-- new
  const [formData, setFormData] = useState({
    purchasePrice: '',
    earnestMoney: '',
    closingDate: '',
    titleCompany: '',
    governingLaw: '',
    includeInspectionClause: false,
    includeClearTitleClause: false,
    includeAssignmentClause: false,
    includeDistributionOfProceeds: false,
    additionalClauses: '',
  });
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const quillRef = useRef(null);
  const token = localStorage.getItem('token');

  // ─── Load existing contract metadata & token if editing ─────────
  useEffect(() => {
    if (!initialContractId) return;

    const loadContract = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/contracts/${initialContractId}/`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${token}`,
            },
          }
        );
        await checkStatus(res);
        const meta = await res.json();

        setContractId(meta.id);
        setContractToken(meta.contract_token); // <-- capture the token

        setFormData({
          purchasePrice: meta.purchase_price || '',
          earnestMoney: meta.earnest_money || '',
          closingDate: meta.closing_date || '',
          titleCompany: meta.title_company || '',
          governingLaw: meta.governing_law || '',
          includeInspectionClause: !!meta.include_inspection_clause,
          includeClearTitleClause: !!meta.include_clear_title_clause,
          includeAssignmentClause: !!meta.include_assignment_clause,
          includeDistributionOfProceeds: !!meta.include_distribution_of_proceeds,
          additionalClauses: meta.additional_clauses || '',
        });
      } catch (err) {
        console.error('Error loading contract metadata:', err);
        alert('Could not load existing contract.');
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [initialContractId, token]);

  // ─── STEP 1: Save metadata, get back id & token ────────────────
  const handleMetadataNext = async () => {
    setLoading(true);
    try {
      let cid = contractId;
      let ctoken = contractToken;

      if (!cid) {
        // CREATE
        const res = await fetch(`${API_BASE}/contracts/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ lead: leadId, ...formData }),
        });
        await checkStatus(res);
        const json = await res.json();

        cid = json.id;
        ctoken = json.contract_token;
        setContractId(cid);
        setContractToken(ctoken);

        onSave?.(json);
      } else {
        // UPDATE
        const res = await fetch(`${API_BASE}/contracts/${cid}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(formData),
        });
        await checkStatus(res);
      }

      setStep(1);
    } catch (err) {
      console.error('Meta Next error:', err);
      alert('Failed to save contract details.');
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2: AI Fill & advance ────────────────────────────────
  const handleAIFill = async () => {
    if (!contractId) return alert('Please save the details first.');
    setAiLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/contracts/${contractId}/ai-fill/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        }
      );
      await checkStatus(res);
      const { html: aiHtml } = await res.json();
      setHtml(aiHtml);
      setStep(2);
    } catch (err) {
      console.error('AI Fill error:', err);
      alert('AI auto-fill failed.');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── STEP 3: Persist HTML & generate the PDF ─────────────────
  const handleSaveAndPdf = async () => {
    if (!contractToken) return alert('Missing contract token.');
    setSaving(true);
    try {
      // 1. save the HTML
      const res = await fetch(
        `${API_BASE}/contracts/${contractId}/html/`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ html }),
        }
      );
      await checkStatus(res);

      // 2. generate & fetch the PDF by token (not by numeric ID!)
      const pdfRes = await fetch(
        `${API_BASE}/contracts/${contractToken}/pdf/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      await checkStatus(pdfRes);

      onSave?.({ id: contractId, contract_token: contractToken });
      onClose();
    } catch (err) {
      console.error('Save & PDF error:', err);
      alert('Failed to generate PDF.');
    } finally {
      setSaving(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div className="contract-editor-overlay">
      <div className="contract-editor-container">
        <header className="modal-header">
          <h3>
            {step === 0 && (contractId ? 'Edit Details' : 'New Contract')}
            {step === 1 && 'Choose Clauses & AI Fill'}
            {step === 2 && 'Edit & Generate PDF'}
          </h3>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </header>

        <ContractSteps step={step} totalSteps={TOTAL_STEPS} />

        <div className="editor-body">
          <main className="editor-main">
            {step === 0 && (
              <div className="contract-form-grid">
                {loading ? (
                  <p>Loading…</p>
                ) : (
                  <>
                    <label>Purchase Price</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.purchasePrice}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          purchasePrice: e.target.value,
                        }))
                      }
                    />

                    <label>Earnest Money</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.earnestMoney}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          earnestMoney: e.target.value,
                        }))
                      }
                    />

                    <label>Closing Date</label>
                    <input
                      type="date"
                      value={formData.closingDate}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          closingDate: e.target.value,
                        }))
                      }
                    />

                    <label>Title Company</label>
                    <input
                      type="text"
                      placeholder="e.g. Platinum Title"
                      value={formData.titleCompany}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          titleCompany: e.target.value,
                        }))
                      }
                    />

                    <label>Governing Law</label>
                    <input
                      type="text"
                      placeholder="e.g. NE"
                      value={formData.governingLaw}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          governingLaw: e.target.value,
                        }))
                      }
                    />
                  </>
                )}
              </div>
            )}

            {step === 1 && (
              <>
                <ContractClauseBuilder
                  contract={formData}
                  setContract={(updates) =>
                    setFormData((f) => ({ ...f, ...updates }))
                  }
                />
                <div className="ai-actions">
                  <button onClick={handleAIFill} disabled={aiLoading}>
                    {aiLoading ? 'Filling…' : 'Auto-Fill with AI'}
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={html}
                onChange={setHtml}
                style={{ height: '100%', background: '#fff' }}
              />
            )}
          </main>
        </div>

        <footer className="modal-actions">
          {step > 0 && (
            <button
              className="cancel-btn"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading || aiLoading || saving}
            >
              Back
            </button>
          )}

          {step < TOTAL_STEPS - 1 && (
            <button
              className="save-btn"
              onClick={step === 0 ? handleMetadataNext : () => setStep((s) => s + 1)}
              disabled={loading || saving}
            >
              {loading ? 'Please wait…' : 'Next'}
            </button>
          )}

          {step === TOTAL_STEPS - 1 && (
            <button
              className="save-btn"
              onClick={handleSaveAndPdf}
              disabled={saving}
            >
              {saving ? 'Generating…' : 'Save & Generate PDF'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ContractEditorModal;