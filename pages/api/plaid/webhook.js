import { getAdminSupabase } from '../../../lib/plaidServer';

// POST /api/plaid/webhook
// Plaid posts events here when new transactions are available, items error, etc.
// Webhook URL is set via PLAID_WEBHOOK_URL env var passed to linkTokenCreate.
//
// For MVP we just mark the item as needing a sync (clearing last_synced_at)
// and rely on the dashboard/cron job to pick it up next. Webhook signature
// verification can be added later via PLAID_WEBHOOK_SECRET.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const body = req.body || {};
  const { webhook_type, webhook_code, item_id } = body;

  console.log('Plaid webhook:', webhook_type, webhook_code, 'item:', item_id);

  if (webhook_type === 'TRANSACTIONS' && item_id) {
    try {
      const supabase = getAdminSupabase();
      await supabase
        .from('plaid_items')
        .update({ last_synced_at: null, updated_at: new Date().toISOString() })
        .eq('plaid_item_id', item_id);
    } catch (err) {
      console.error('webhook db update failed:', err);
    }
  }

  return res.status(200).json({ ok: true });
}
