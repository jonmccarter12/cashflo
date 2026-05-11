import { getPlaidClient, getAdminSupabase, getUserFromRequest } from '../../../lib/plaidServer';

// POST /api/plaid/remove-item { plaid_item_id }
// Revokes the token at Plaid and deletes the local rows.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: authError || 'Unauthorized' });

  const { plaid_item_id } = req.body || {};
  if (!plaid_item_id) return res.status(400).json({ error: 'plaid_item_id required' });

  const supabase = getAdminSupabase();
  const { data: item, error: lookupErr } = await supabase
    .from('plaid_items')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('plaid_item_id', plaid_item_id)
    .single();
  if (lookupErr || !item) return res.status(404).json({ error: 'Item not found' });

  try {
    await getPlaidClient().itemRemove({ access_token: item.access_token });
  } catch (err) {
    console.error('plaid item remove warning:', err?.response?.data || err);
    // Continue — we still want to clean up local rows.
  }

  // Clean up local rows. plaid_transactions and plaid_accounts cascade via user_id;
  // we filter by plaid_item_id explicitly so other items stay intact.
  await supabase.from('plaid_transactions').delete().eq('user_id', user.id).eq('plaid_item_id', plaid_item_id);
  await supabase.from('plaid_accounts').delete().eq('user_id', user.id).eq('plaid_item_id', plaid_item_id);
  await supabase.from('plaid_items').delete().eq('user_id', user.id).eq('plaid_item_id', plaid_item_id);

  return res.status(200).json({ ok: true });
}
