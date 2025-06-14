// src/api/customerImportService.js
import axios from 'axios';

/**
 * Upload CSV for customer import.
 * @param {File} file - The CSV file from an <input type="file" /> element
 * @returns {Promise<{ task_id: string }>} - e.g. { task_id: 'abc123' }
 */
export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  // Adjust this to your actual Django endpoint
  // e.g. /api/customers/import/
  const { data } = await axios.post('/api/customers/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // Must contain { task_id: string } or similar
}

/**
 * Check import status by task_id.
 * @param {string} taskId
 * @returns {Promise<{ status: string, processed?: number, total?: number, error_message?: string }>}
 */
export async function getImportStatus(taskId) {
  // e.g. /api/customers/import_status/abc123/
  const { data } = await axios.get(`/api/customers/import_status/${taskId}/`);
  return data;
}

/**
 * Get final results (like newly imported customers or AI data).
 * @param {string} taskId
 * @returns {Promise<Array>} - array of imported records
 */
export async function getImportedCustomers(taskId) {
  // e.g. /api/customers/imported_results/abc123/
  const { data } = await axios.get(`/api/customers/imported_results/${taskId}/`);
  return data;
}