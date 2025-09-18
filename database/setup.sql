-- Cashflo Database Setup - PRIVATE USER DATA ONLY
-- Run this SQL in your Supabase SQL Editor
--
-- IMPORTANT: All financial data is private and user-isolated
-- No financial information should ever be accessible across users

-- Create transaction_log table (PRIVATE - user-isolated)
CREATE TABLE IF NOT EXISTS public.transaction_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    item_id UUID NOT NULL,
    payload JSONB DEFAULT '{}',
    description TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_log_user_id ON public.transaction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_log_timestamp ON public.transaction_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_transaction_log_user_type ON public.transaction_log(user_id, type);

-- Enable Row Level Security (RLS) - CRITICAL for data privacy
ALTER TABLE public.transaction_log ENABLE ROW LEVEL SECURITY;

-- STRICT RLS policies - users can ONLY access their own data
DO $$ BEGIN
    CREATE POLICY "Users can ONLY view their own transactions" ON public.transaction_log
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY insert their own transactions" ON public.transaction_log
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY update their own transactions" ON public.transaction_log
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY delete their own transactions" ON public.transaction_log
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create nw_history table for net worth tracking (PRIVATE - user-isolated)
CREATE TABLE IF NOT EXISTS public.nw_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    net_worth DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Enable RLS for nw_history - CRITICAL for financial privacy
ALTER TABLE public.nw_history ENABLE ROW LEVEL SECURITY;

-- STRICT RLS policies for net worth - users can ONLY access their own data
DO $$ BEGIN
    CREATE POLICY "Users can ONLY view their own net worth history" ON public.nw_history
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY insert their own net worth history" ON public.nw_history
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY update their own net worth history" ON public.nw_history
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY delete their own net worth history" ON public.nw_history
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index for nw_history
CREATE INDEX IF NOT EXISTS idx_nw_history_user_id ON public.nw_history(user_id);
CREATE INDEX IF NOT EXISTS idx_nw_history_date ON public.nw_history(date);

-- Create user_settings table for storing user preferences (PRIVATE - user-isolated)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Enable RLS for user_settings - CRITICAL for privacy
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- STRICT RLS policies for user settings - users can ONLY access their own data
DO $$ BEGIN
    CREATE POLICY "Users can ONLY view their own settings" ON public.user_settings
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY insert their own settings" ON public.user_settings
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY update their own settings" ON public.user_settings
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can ONLY delete their own settings" ON public.user_settings
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON public.user_settings(user_id, key);