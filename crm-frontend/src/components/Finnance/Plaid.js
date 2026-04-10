import React from 'react';
import { usePlaidLink } from 'react-plaid-link';
import api from '../../apiClient';

const PlaidLinkButton = () => {
  const linkToken = process.env.REACT_APP_PLAID_LINK_TOKEN || '';
  const config = {
    token: linkToken || null,
    onSuccess: async (public_token) => {
      try {
        // Persist lightweight connection status in tenant preferences until
        // a dedicated Plaid exchange endpoint is added to backend.
        await api.patch('/accounts/preferences/', {
          preferences: {
            integrations: {
              plaid_linked: true,
              plaid_last_linked_at: new Date().toISOString(),
            },
            finance: {
              plaid_public_token_preview: String(public_token || '').slice(0, 8),
            },
          },
        });
      } catch (error) {
        console.warn('Could not persist Plaid connection status.', error);
      }
    },
    onExit: (err, metadata) => {
      // Handle the case when your user exits Plaid Link
      console.log("Plaid Link exited:", err, metadata);
    },
  };

  const { open, ready } = usePlaidLink(config);
  const disabled = !linkToken || !ready;

  return (
    <button onClick={() => open()} disabled={disabled} title={!linkToken ? 'Configure REACT_APP_PLAID_LINK_TOKEN' : undefined}>
      Link Bank Account
    </button>
  );
};

export default PlaidLinkButton;
