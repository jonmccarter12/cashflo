import { getPlaidClient, getAdminSupabase, getUserFromRequest } from '../../../lib/plaidServer';

// POST /api/plaid/sync-transactions
// Body (optional):
//   - plaid_item_id?: string — if set, only sync that item
//   - min_age_hours?: number — if set, skip items synced more recently than this
//                              (used by auto-sync to avoid hammering Plaid)
//
// Uses Plaid's /transactions/sync (cursor-based). Idempotent and safe to call repeatedly.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: authError || 'Unauthorized' });

  const plaid = getPlaidClient();
  const supabase = getAdminSupabase();

  // Fetch the items to sync
  let itemsQuery = supabase.from('plaid_items').select('*').eq('user_id', user.id);
  if (req.body?.plaid_item_id) itemsQuery = itemsQuery.eq('plaid_item_id', req.body.plaid_item_id);
  const { data: itemsRaw, error: itemsError } = await itemsQuery;
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  // Optional staleness gate — skip items synced more recently than min_age_hours
  const minAgeHours = Number(req.body?.min_age_hours) || 0;
  const items = (itemsRaw || []).filter(it => {
    if (!minAgeHours) return true;
    if (!it.last_synced_at) return true; // never synced → always sync
    const ageMs = Date.now() - new Date(it.last_synced_at).getTime();
    return ageMs >= minAgeHours * 60 * 60 * 1000;
  });

  if (!items?.length) return res.status(200).json({ ok: true, items: 0, added: 0, modified: 0, removed: 0, skipped_fresh: (itemsRaw || []).length });

  const summary = { items: items.length, added: 0, modified: 0, removed: 0, errors: [] };

  for (const item of items) {
    try {
      let cursor = item.transactions_cursor || null;
      let hasMore = true;
      const allAdded = [];
      const allModified = [];
      const allRemoved = [];

      while (hasMore) {
        const resp = await plaid.transactionsSync({
          access_token: item.access_token,
          cursor: cursor || undefined,
          count: 500,
        });
        const d = resp.data;
        allAdded.push(...d.added);
        allModified.push(...d.modified);
        allRemoved.push(...d.removed);
        hasMore = d.has_more;
        cursor = d.next_cursor;
      }

      // Upsert added + modified
      const upserts = [...allAdded, ...allModified].map(t => ({
        user_id: user.id,
        plaid_item_id: item.plaid_item_id,
        plaid_account_id: t.account_id,
        plaid_transaction_id: t.transaction_id,
        amount: t.amount,
        iso_currency_code: t.iso_currency_code || null,
        date: t.date,
        authorized_date: t.authorized_date || null,
        name: t.name || null,
        merchant_name: t.merchant_name || null,
        category: t.category || null,
        pending: !!t.pending,
        payment_channel: t.payment_channel || null,
        raw: t,
        updated_at: new Date().toISOString(),
      }));

      if (upserts.length) {
        const { error: upErr } = await supabase
          .from('plaid_transactions')
          .upsert(upserts, { onConflict: 'plaid_transaction_id' });
        if (upErr) throw upErr;
      }

      // Delete removed
      if (allRemoved.length) {
        const removedIds = allRemoved.map(r => r.transaction_id);
        const { error: delErr } = await supabase
          .from('plaid_transactions')
          .delete()
          .in('plaid_transaction_id', removedIds);
        if (delErr) throw delErr;
      }

      // Refresh balances (live fetch) — keeps the displayed balance accurate
      try {
        const balResp = await plaid.accountsBalanceGet({ access_token: item.access_token });
        const balanceRows = balResp.data.accounts.map(a => ({
          user_id: user.id,
          plaid_item_id: item.plaid_item_id,
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
        if (balanceRows.length) {
          await supabase.from('plaid_accounts').upsert(balanceRows, { onConflict: 'plaid_account_id' });
        }
      } catch (balErr) {
        console.error('balance refresh failed (non-fatal):', balErr?.response?.data || balErr);
      }

      // Persist cursor
      await supabase
        .from('plaid_items')
        .update({
          transactions_cursor: cursor,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      summary.added += allAdded.length;
      summary.modified += allModified.length;
      summary.removed += allRemoved.length;
    } catch (err) {
      console.error(`sync failed for item ${item.plaid_item_id}:`, err?.response?.data || err);
      summary.errors.push({
        plaid_item_id: item.plaid_item_id,
        error: err?.response?.data?.error_message || err.message,
      });
    }
  }

  return res.status(200).json({ ok: summary.errors.length === 0, ...summary });
}
