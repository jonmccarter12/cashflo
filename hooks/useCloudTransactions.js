import React from 'react';
import { loadData, saveData, TRANSACTION_LOG_KEY } from '../lib/utils';
import { notify } from '../components/Notify';

export function useCloudTransactions(userId, supabase) {
  const [transactions, setTransactions] = React.useState(() => {
    const { data } = loadData(TRANSACTION_LOG_KEY, []);
    return data;
  });

  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);

  // Fetch initial transactions and subscribe to changes
  React.useEffect(() => {
    if (!userId || !supabase) {
      setTransactions([]); // Clear transactions if user logs out
      return;
    }

    // Don't clear transactions immediately - keep them until we fetch new ones
    // This prevents the 0 balance flash when switching users or refreshing

    async function fetchInitialTransactions() {
      setSyncing(true);
      setSyncError(null);
      try {
        const { data, error } = await supabase
          .from('transaction_log')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: true });

        if (error) throw error;
        
        // Simple merge: remote data is the source of truth
        setTransactions(data);
        saveData(TRANSACTION_LOG_KEY, data);
        setLastSync(new Date().toISOString());
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setSyncError(error.message);
        notify('Failed to fetch transaction history from the cloud.', 'error');
      } finally {
        setSyncing(false);
      }
    }

    fetchInitialTransactions();

    // Set up real-time subscription
    const channel = supabase.channel(`transactions:${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transaction_log', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('Real-time transaction change received:', payload);
          // Re-fetch all to ensure consistency. More advanced logic could apply the patch.
          fetchInitialTransactions();
          notify('Data updated in real-time.', 'info');
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time transactions for user ${userId}`);
        }
        if (err) {
          console.error('Real-time subscription error:', err);
          setSyncError(err.message);
        }
      });
      
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };

  }, [userId, supabase]);

  return [transactions, setTransactions, { syncing, lastSync, syncError }];
}
