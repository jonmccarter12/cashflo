import React from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { notify } from './Notify';

// Helper: get the current Supabase access token from the supabase client.
async function getAuthHeader(supabase) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function apiCall(path, supabase, { method = 'POST', body } = {}) {
  const auth = await getAuthHeader(supabase);
  if (!auth) throw new Error('Not signed in.');
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${path} failed (${res.status})`);
  return json;
}

function PlaidLinkButton({ linkToken, onSuccess, disabled }) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => onSuccess(public_token, metadata),
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready || disabled}
      style={{
        padding: '0.625rem 1.25rem',
        background: !ready || disabled ? '#9ca3af' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: !ready || disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {ready ? '+ Connect Bank or Cash App' : 'Loading…'}
    </button>
  );
}

export default function PlaidConnect({ user, supabase }) {
  const [linkToken, setLinkToken] = React.useState(null);
  const [linkError, setLinkError] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);

  const refreshItems = React.useCallback(async () => {
    if (!user?.id || !supabase) return;
    setLoading(true);
    try {
      const json = await apiCall('/api/plaid/items', supabase, { method: 'GET' });
      setItems(json.items || []);
    } catch (err) {
      console.error('items fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Fetch a link_token + the user's items on mount
  React.useEffect(() => {
    if (!user?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const json = await apiCall('/api/plaid/create-link-token', supabase);
        if (!cancelled) setLinkToken(json.link_token);
      } catch (err) {
        console.error('link token failed:', err);
        if (!cancelled) setLinkError(err.message);
      }
    })();
    refreshItems();
    return () => { cancelled = true; };
  }, [user?.id, supabase, refreshItems]);

  const handlePlaidSuccess = async (public_token, metadata) => {
    try {
      notify('Connecting…');
      await apiCall('/api/plaid/exchange-token', supabase, {
        body: { public_token, institution: metadata?.institution },
      });
      notify('Connected. Pulling transactions…', 'success');
      setSyncing(true);
      const sync = await apiCall('/api/plaid/sync-transactions', supabase);
      notify(`Synced ${sync.added} new transactions.`, 'success');
      await refreshItems();
    } catch (err) {
      notify(`Connect failed: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const sync = await apiCall('/api/plaid/sync-transactions', supabase);
      notify(`Synced ${sync.added} added, ${sync.modified} modified, ${sync.removed} removed.`, 'success');
      await refreshItems();
    } catch (err) {
      notify(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (plaid_item_id) => {
    if (!confirm('Disconnect this account? All its synced transactions will be removed.')) return;
    try {
      await apiCall('/api/plaid/remove-item', supabase, { body: { plaid_item_id } });
      notify('Disconnected.', 'success');
      await refreshItems();
    } catch (err) {
      notify(`Disconnect failed: ${err.message}`, 'error');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
        Sign in to connect your bank or Cash App.
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#000', margin: 0 }}>Connected Accounts</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {items.length > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                padding: '0.5rem 1rem',
                background: syncing ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              {syncing ? 'Syncing…' : '↻ Sync Now'}
            </button>
          )}
          {linkToken && <PlaidLinkButton linkToken={linkToken} onSuccess={handlePlaidSuccess} disabled={syncing} />}
        </div>
      </div>

      {linkError && (
        <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Could not load Plaid: {linkError}
        </div>
      )}

      {loading && items.length === 0 && (
        <div style={{ color: '#6b7280', textAlign: 'center', padding: '1.5rem' }}>Loading…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
          No accounts connected yet. Click <strong>Connect</strong> above to link your bank or Cash App.
          <br /><br />
          In Sandbox mode, use credentials <code style={{ background: '#fff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>user_good</code> / <code style={{ background: '#fff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>pass_good</code> to test.
        </div>
      )}

      {items.map(item => (
        <div key={item.plaid_item_id} style={{
          padding: '1rem',
          marginBottom: '0.75rem',
          background: '#f9fafb',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem', color: '#000' }}>
                {item.institution_name || 'Connected Account'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {item.accounts?.length || 0} account{item.accounts?.length === 1 ? '' : 's'}
                {item.last_synced_at && ` • Last synced ${new Date(item.last_synced_at).toLocaleString()}`}
              </div>
            </div>
            <button
              onClick={() => handleDisconnect(item.plaid_item_id)}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
          {item.accounts?.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.25rem' }}>
              {item.accounts.map(a => (
                <div key={a.plaid_account_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'white', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#000' }}>
                    {a.name} {a.mask && <span style={{ color: '#6b7280' }}>···{a.mask}</span>}
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{a.subtype || a.type}</span>
                  </span>
                  <span style={{ fontWeight: '600', color: '#000' }}>
                    {typeof a.current_balance === 'number' ? `$${a.current_balance.toFixed(2)}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
