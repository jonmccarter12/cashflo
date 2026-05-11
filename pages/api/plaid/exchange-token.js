import { getPlaidClient, getAdminSupabase, getUserFromRequest } from '../../../lib/plaidServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: authError || 'Unauthorized' });

  const { public_token, institution } = req.body || {};
  if (!public_token) return res.status(400).json({ error: 'public_token required' });

  try {
    const plaid = getPlaidClient();

    // Exchange public_token for access_token (long-lived)
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const access_token = exchange.data.access_token;
    const item_id = exchange.data.item_id;

    // Persist the item server-side
    const supabase = getAdminSupabase();
    const { error: upsertError } = await supabase
      .from('plaid_items')
      .upsert({
        user_id: user.id,
        plaid_item_id: item_id,
        access_token,
        institution_id: institution?.institution_id || null,
        institution_name: institution?.name || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plaid_item_id' });

    if (upsertError) throw upsertError;

    // Pull initial account snapshot with LIVE balances (forces fresh fetch from bank,
    // vs accountsGet which can return cached data).
    try {
      const accountsResp = await plaid.accountsBalanceGet({ access_token });
      const accountRows = accountsResp.data.accounts.map(a => ({
        user_id: user.id,
        plaid_item_id: item_id,
        plaid_account_id: a.account_id,
        name: a.name,
        official_name: a.official_name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        current_balance: a.balances?.current ?? null,
        available_balance: a.balances?.available ?? null,
        iso_currency_code: a.balances?.iso_currency_code || null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      if (accountRows.length) {
        await supabase.from('plaid_accounts').upsert(accountRows, { onConflict: 'plaid_account_id' });
      }
    } catch (acctErr) {
      console.error('account snapshot failed (non-fatal):', acctErr?.response?.data || acctErr);
    }

    return res.status(200).json({ ok: true, plaid_item_id: item_id });
  } catch (err) {
    console.error('exchange-token error:', err?.response?.data || err);
    return res.status(500).json({ error: err?.response?.data?.error_message || err.message });
  }
}
