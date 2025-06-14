import React from 'react';
import { usePlaidLink } from 'react-plaid-link';

const PlaidLinkButton = () => {
  const config = {
    token: 'GENERATED_LINK_TOKEN_FROM_YOUR_BACKEND', // You need to create this via Plaid API on the backend
    onSuccess: (public_token, metadata) => {
      // Send the public_token to your backend
      fetch('http://127.0.0.1:808/api/finance/exchange-token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Exchange response:", data);
          // Save any necessary information, e.g., update state or notify the user
        })
        .catch((error) => {
          console.error("Error exchanging token:", error);
        });
    },
    onExit: (err, metadata) => {
      // Handle the case when your user exits Plaid Link
      console.log("Plaid Link exited:", err, metadata);
    },
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <button onClick={() => open()} disabled={!ready}>
      Link Bank Account
    </button>
  );
};

export default PlaidLinkButton;