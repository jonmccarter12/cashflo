import { getAdminSupabase, getUserFromRequest } from '../../../lib/plaidServer';

// GET /api/plaid/items — list the caller's connected Plaid items + their accounts.
// Never returns access_token.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: authError || 'Unauthorized' });

  const supabase = getAdminSupabase();

  const { data: items, error: itemsErr } = await supabase
    .from('plaid_items')
    .select('id, plaid_item_id, institution_id, institution_name, last_synced_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (itemsErr) return res.status(500).json({ error: itemsErr.message });

  const { data: accounts, error: acctErr } = await supabase
    .from('plaid_accounts')
    .select('plaid_item_id, plaid_account_id, name, official_name, type, subtype, mask, current_balance, available_balance, iso_currency_code')
    .eq('user_id', user.id);
  if (acctErr) return res.status(500).json({ error: acctErr.message });

  // Group accounts under their item
  const byItem = new Map();
  for (const a of accounts || []) {
    if (!byItem.has(a.plaid_item_id)) byItem.set(a.plaid_item_id, []);
    byItem.get(a.plaid_item_id).push(a);
  }

  const result = (items || []).map(it => ({ ...it, accounts: byItem.get(it.plaid_item_id) || [] }));
  return res.status(200).json({ items: result });
}
