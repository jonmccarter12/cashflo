-- Cashflo Plaid Integration Schema
-- Run this in your Supabase SQL Editor (paste-and-run, safe to re-run).
--
-- Adds two tables:
--   plaid_items        — one row per connected institution (holds access_token, server-only)
--   plaid_transactions — synced bank transactions (readable by the owning user)

-- ============================================================================
-- plaid_items: stores Plaid access_tokens.
-- Access tokens grant ongoing access to a bank — they must NEVER leave the
-- server. RLS denies all client reads; only the service_role key can touch this.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plaid_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_item_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    institution_id TEXT,
    institution_name TEXT,
    transactions_cursor TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON public.plaid_items(user_id);

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

-- No policies = no anon/authenticated access. Only service_role can read/write.

-- ============================================================================
-- plaid_transactions: bank-side transactions imported from Plaid.
-- Readable by the owning user; writes only via service_role (server-side sync).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plaid_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_item_id TEXT NOT NULL,
    plaid_account_id TEXT NOT NULL,
    plaid_transaction_id TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL,
    iso_currency_code TEXT,
    date DATE NOT NULL,
    authorized_date DATE,
    name TEXT,
    merchant_name TEXT,
    category TEXT[],
    pending BOOLEAN DEFAULT FALSE,
    payment_channel TEXT,
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plaid_tx_user_id ON public.plaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_tx_date ON public.plaid_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_plaid_tx_account ON public.plaid_transactions(plaid_account_id);

ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own plaid transactions" ON public.plaid_transactions
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No INSERT/UPDATE/DELETE policies — only service_role can write.

-- ============================================================================
-- plaid_accounts: per-institution account metadata (balances, names).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plaid_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_item_id TEXT NOT NULL,
    plaid_account_id TEXT NOT NULL UNIQUE,
    name TEXT,
    official_name TEXT,
    type TEXT,
    subtype TEXT,
    mask TEXT,
    current_balance NUMERIC(12,2),
    available_balance NUMERIC(12,2),
    iso_currency_code TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON public.plaid_accounts(user_id);

ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own plaid accounts" ON public.plaid_accounts
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add plaid_accounts to the realtime publication so balance updates broadcast
-- to all open tabs without a page refresh.
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plaid_accounts;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
