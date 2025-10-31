// src/api/communications.js
import api from '../apiClient';

export const fetchInboxMessages = async (filters = {}) => {
  const res = await api.get('/comms/inbox/', { params: filters });
  return res.data;
};

export const updateMessageStatus = async (logId, updates) => {
  const res = await api.patch(`/comms/update/${logId}/`, updates);
  return res.data;
};

export const fetchThreadMessages = async (threadId) => {
  const res = await api.get('/comms/thread/', { params: { thread_id: threadId } });
  return res.data.messages;
};

export const fetchSmartReply = async (leadId, customerId) => {
  const res = await api.get('/comms/smart-reply/', {
    params: { lead_id: leadId, customer_id: customerId },
  });
  return res.data;
};