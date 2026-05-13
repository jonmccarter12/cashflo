import React from 'react';

// Triggers /api/plaid/sync-transactions on mount + every interval. Returns a
// manual `sync()` that the UI can call (e.g., a button). Manual sync forces
// a full refresh; auto-sync passes min_age_hours so Plaid isn't hit unless
// the data is actually stale.

const AUTO_SYNC_INTERVAL_HOURS = 3;

async function callSync(supabase, { force = false } = {}) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;

  const body = force ? {} : { min_age_hours: AUTO_SYNC_INTERVAL_HOURS };
  const res = await fetch('/api/plaid/sync-transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `sync failed (${res.status})`);
  return json;
}

export function usePlaidSync(userId, supabase, { onSynced } = {}) {
  const [syncing, setSyncing] = React.useState(false);
  const [lastResult, setLastResult] = React.useState(null);
  const onSyncedRef = React.useRef(onSynced);
  React.useEffect(() => { onSyncedRef.current = onSynced; }, [onSynced]);

  const sync = React.useCallback(async ({ force = false } = {}) => {
    if (!userId || !supabase) return null;
    setSyncing(true);
    try {
      const result = await callSync(supabase, { force });
      setLastResult(result);
      if (result && onSyncedRef.current) onSyncedRef.current(result);
      return result;
    } catch (err) {
      console.error('sync failed:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [userId, supabase]);

  // Auto-sync: once on mount, then every AUTO_SYNC_INTERVAL_HOURS.
  // Server's min_age_hours gate means we won't actually hit Plaid unless stale.
  React.useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;

    const run = async () => {
      try {
        const result = await callSync(supabase, { force: false });
        if (!cancelled && result && onSyncedRef.current) onSyncedRef.current(result);
      } catch (err) {
        if (!cancelled) console.error('auto-sync failed:', err);
      }
    };

    // Defer slightly so initial page render isn't blocked
    const initial = setTimeout(run, 2000);
    const interval = setInterval(run, AUTO_SYNC_INTERVAL_HOURS * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [userId, supabase]);

  return { sync, syncing, lastSyncResult: lastResult };
}
