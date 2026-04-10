import React from 'react';
import FilesTab from './FilesTab';

const DocumentsTab = ({ lead }) => {
  const record = lead
    ? {
        object: lead.object || 'customer',
        id: lead.id || lead.customer_id,
        raw: lead,
      }
    : null;
  return <FilesTab record={record} />;
};

export default DocumentsTab;
