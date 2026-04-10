import api from '../apiClient';

/**
 * Upload CSV for customer import.
 * @param {File} file - The CSV file from an <input type="file" /> element
 * @returns {Promise<{ task_id: string }>}
 */
export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/imports/customers/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Check import status by task_id.
 * @param {string} taskId
 * @returns {Promise<{ status: string, processed?: number, total?: number, error_message?: string }>}
 */
export async function getImportStatus(taskId) {
  const { data } = await api.get(`/imports/status/${taskId}/`);
  return data;
}

/**
 * Get final results (like newly imported customers or AI data).
 * @param {string} taskId
 * @returns {Promise<Array>} - array of imported records
 */
export async function getImportedCustomers(taskId) {
  const { data } = await api.get('/imports/failures/', {
    params: taskId ? { task_id: taskId } : undefined,
  });
  return data;
}
