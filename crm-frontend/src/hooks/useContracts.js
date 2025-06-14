 // src/hooks/useContracts.js
import { useState, useEffect, useCallback } from 'react';
import {
  fetchContracts,
  fetchDocuments,
  fetchSignatures,
  createContractRecord,
  updateContractRecord,
  generatePdf,
} from '../services/ContractServices'; // or '../api/contractsApi'

export default function useContracts(leadId) {
  const token = localStorage.getItem('token');

  // State
  const [contracts, setContracts] = useState([]);
  const [docs, setDocs]           = useState([]);
  const [sigs, setSigs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Reload everything
  const reloadAll = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);

    try {
      const [ctrList, d, s] = await Promise.all([
        fetchContracts(leadId, token),
        fetchDocuments(leadId, token),
        fetchSignatures(leadId, token),
      ]);
      setContracts(ctrList);
      setDocs(d);
      setSigs(s);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [leadId, token]);

  // Initial load & on lead change
  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Create a fresh Contract record, generate PDF, then reload
  const createContract = async (payload) => {
    setLoading(true);
    try {
      const contract = await createContractRecord(leadId, payload, token);
      await generatePdf(contract.contract_token, token);
      await reloadAll();
      return contract;
    } catch (err) {
      console.error(err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update existing Contract, optionally re-generate PDF, then reload
  const updateContract = async (contractId, payload, regenPdf = false) => {
    setLoading(true);
    try {
      const contract = await updateContractRecord(contractId, payload, token);
      if (regenPdf) {
        await generatePdf(contract.contract_token, token);
      }
      await reloadAll();
      return contract;
    } catch (err) {
      console.error(err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    contracts,
    docs,
    sigs,
    loading,
    error,
    reloadAll,
    createContract,
    updateContract,
  };
}