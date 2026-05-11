import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────
// Plaid client (singleton)
// ──────────────────────────────────────────────────────────
let plaidClient = null;

export function getPlaidClient() {
  if (plaidClient) return plaidClient;

  const env = process.env.PLAID_ENV || 'sandbox';
  const basePath = PlaidEnvironments[env];
  if (!basePath) throw new Error(`Invalid PLAID_ENV "${env}". Use sandbox, development, or production.`);

  const cfg = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
        'Plaid-Version': '2020-09-14',
      },
    },
  });

  plaidClient = new PlaidApi(cfg);
  return plaidClient;
}

// ──────────────────────────────────────────────────────────
// Supabase clients
//   - anonClient: used to validate the caller's JWT
//   - adminClient: service_role, used for plaid_items writes
// ──────────────────────────────────────────────────────────
let anonClient = null;
let adminClient = null;

export function getAnonSupabase() {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase URL or anon key missing in env.');
  anonClient = createClient(url, key);
  return anonClient;
}

export function getAdminSupabase() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing — set it in .env.local and Vercel env.');
  adminClient = createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}

// ──────────────────────────────────────────────────────────
// Auth helper for API routes
// ──────────────────────────────────────────────────────────
export async function getUserFromRequest(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { user: null, error: 'Missing bearer token' };

  const { data, error } = await getAnonSupabase().auth.getUser(token);
  if (error || !data?.user) return { user: null, error: error?.message || 'Invalid token' };
  return { user: data.user, error: null };
}
