import React from 'react';

// Subscribes to plaid_accounts for the current user. Returns rows shaped to
// match the manual-account shape used by Dashboard (id, name, type, balance,
// source: 'plaid', plaid_account_id) so they merge cleanly into the accounts list.

const isCredit = (a) => a.type === 'credit' || a.subtype === 'credit card';

function mapPlaidRow(row) {
  // For checking/savings use available_balance (what's actually spendable).
  // For credit cards use current_balance (the debt owed).
  const balance = isCredit(row)
    ? (row.current_balance ?? 0)
    : (row.available_balance ?? row.current_balance ?? 0);

  return {
    id: `plaid:${row.plaid_account_id}`,
    plaid_account_id: row.plaid_account_id,
    plaid_item_id: row.plaid_item_id,
    name: row.name + (row.mask ? ` ···${row.mask}` : ''),
    type: isCredit(row) ? 'Credit' : (row.subtype === 'savings' ? 'Bank' : 'Bank'),
    accountType: isCredit(row) ? 'credit' : 'debit',
    balance: Number(balance) || 0,
    available_balance: row.available_balance,
    current_balance: row.current_balance,
    source: 'plaid',
    ignored: false,
    iso_currency_code: row.iso_currency_code,
    subtype: row.subtype,
    last_synced_at: row.last_synced_at,
  };
}

export function usePlaidAccounts(userId, supabase) {
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId || !supabase) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAccounts() {
      try {
        const { data, error } = await supabase
          .from('plaid_accounts')
          .select('*')
          .eq('user_id', userId);
        if (error) throw error;
        if (!cancelled) {
          setAccounts((data || []).map(mapPlaidRow));
        }
      } catch (err) {
        console.error('Failed to load plaid_accounts:', err);
        if (!cancelled) setAccounts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAccounts();

    // Realtime subscription — auto-refresh when sync updates balances
    const channel = supabase
      .channel(`plaid-accounts-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'plaid_accounts', filter: `user_id=eq.${userId}` },
        () => { if (!cancelled) fetchAccounts(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return { plaidAccounts: accounts, plaidAccountsLoading: loading };
}
