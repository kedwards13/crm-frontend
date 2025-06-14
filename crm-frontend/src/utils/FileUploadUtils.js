// src/utils/fileUploadUtils.js
import axios from 'axios';

/**
 * Upload a file using a PATCH request.
 *
 * @param {string} endpoint - The API endpoint (e.g., `/api/accounts/users/2/`).
 * @param {Object} fileData - An object with key/value pairs to append to the FormData.
 *                            The file should be provided with its field name.
 * @param {string} token - The JWT access token.
 * @returns {Promise} - Resolves to the server response.
 */
export const uploadFile = async (endpoint, fileData, token) => {
  const formData = new FormData();
  Object.entries(fileData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await axios.patch(endpoint, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

/**
 * Helper to upload a profile picture.
 *
 * @param {number|string} userId - The ID of the user.
 * @param {File} file - The file object.
 * @param {string} token - The JWT token.
 * @returns {Promise} - Resolves to the server response.
 */
export const uploadProfilePicture = (userId, file, token) => {
  const endpoint = `http://127.0.0.1:808/api/accounts/users/${userId}/`;
  return uploadFile(endpoint, { avatar: file }, token);
};

/**
 * Helper to upload a document.
 *
 * @param {number|string} userId - The ID of the user.
 * @param {File} file - The document file.
 * @param {string} token - The JWT token.
 * @returns {Promise} - Resolves to the server response.
 */
export const uploadDocument = (userId, file, token) => {
  const endpoint = `http://127.0.0.1:808/api/accounts/users/${userId}/`;
  return uploadFile(endpoint, { document: file }, token);
};