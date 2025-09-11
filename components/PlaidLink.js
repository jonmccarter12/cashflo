import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';

export default function PlaidLinkButton({ onSuccess, onExit, userId }) {
  const [linkToken, setLinkToken] = useState(null);

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await axios.post('/api/plaid/create-link-token', { userId });
        setLinkToken(response.data.link_token);
      } catch (error) {
        console.error('Error creating link token:', error);
      }
    };
    createLinkToken();
  }, [userId]);

  const handleOnSuccess = useCallback(async (public_token, metadata) => {
    try {
      const response = await axios.post('/api/plaid/exchange-token', { public_token });
      onSuccess(response.data);
    } catch (error) {
      console.error('Error exchanging token:', error);
    }
  }, [onSuccess]);

  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      style={{
        padding: '0.5rem 1rem',
        background: ready ? '#7c3aed' : '#d1d5db',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: ready ? 'pointer' : 'not-allowed'
      }}
    >
      🏦 Connect Bank Account
    </button>
  );
}
