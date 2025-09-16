import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance = null;

function getSupabaseClient() {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized for export.');
    return res.status(500).json({ error: 'Supabase client not configured.' });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization?.split(' ')[1]);

  if (userError || !user) {
    console.error('Authentication error during export:', userError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: transactions, error } = await supabase
      .from('transaction_log')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching transactions for export:', error);
      throw error;
    }

    if (!transactions || transactions.length === 0) {
      return res.status(200).send('No transactions to export.');
    }

    // Generate CSV
    const headers = ['id', 'timestamp', 'type', 'item_id', 'description', 'payload_amount', 'payload_category', 'payload_name', 'payload_old_amount', 'payload_new_amount', 'payload_account_id']; // Example headers
    const csvRows = [headers.join(',')];

    transactions.forEach(transaction => {
      const payload = transaction.payload || {};
      const row = [
        `"${transaction.id}"`,
        `"${new Date(transaction.timestamp).toISOString()}"`,
        `"${transaction.type}"`,
        `"${transaction.item_id || ''}"`,
        `"${transaction.description ? transaction.description.replace(/"/g, '""') : ''}"`, // Escape double quotes
        `"${payload.amount !== undefined ? payload.amount : ''}"`,
        `"${payload.category ? payload.category.replace(/"/g, '""') : ''}"`,
        `"${payload.name ? payload.name.replace(/"/g, '""') : ''}"`,
        `"${payload.old_amount !== undefined ? payload.old_amount : ''}"`,
        `"${payload.new_amount !== undefined ? payload.new_amount : ''}"`,
        `"${payload.account_id || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
    res.status(200).send(csvRows.join('\n'));

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: `Failed to export transactions: ${error.message}` });
  }
}
