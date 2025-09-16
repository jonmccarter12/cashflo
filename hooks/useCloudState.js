import React from 'react';
import { debounce, loadData, saveData } from '../lib/utils';
import { notify } from '../components/Notify';

export function useCloudState(key, defaultValue, userId, supabase) {
  const [localData, setLocalData] = React.useState(() => {
    const { data } = loadData(key, defaultValue);
    return data;
  });
  
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);

  // Debounced save to Supabase
  const debouncedSave = React.useCallback(
    debounce(async (value) => {
      if (!userId || !supabase) return;
      setSyncing(true);
      setSyncError(null);
      try {
        const { error } = await supabase
          .from('user_settings')
          .upsert({ user_id: userId, key: key, value: value }, { onConflict: 'user_id, key' });

        if (error) throw error;
        setLastSync(new Date().toISOString());
      } catch (error) {
        console.error(`Error saving cloud state for key "${key}":`, error);
        setSyncError(error.message);
        notify(`Failed to sync setting "${key}" to the cloud.`, 'error');
      } finally {
        setSyncing(false);
      }
    }, 1000), // 1 second debounce
    [userId, supabase, key]
  );

  // Fetch from Supabase on initial load/user change
  React.useEffect(() => {
    async function fetchData() {
      if (!userId || !supabase) return;
      setSyncing(true);
      setSyncError(null);
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', userId)
          .eq('key', key)
          .single();

        if (error && error.code !== 'PGRST116') { // Ignore 'no rows found'
          throw error;
        }

        if (data) {
          // Cloud data is source of truth, update local state and storage
          setLocalData(data.value);
          saveData(key, data.value);
        } else {
          // No cloud data, so save initial local state to cloud
          debouncedSave(localData);
        }
        setLastSync(new Date().toISOString());
      } catch (error) {
        console.error(`Error fetching cloud state for key "${key}":`, error);
        setSyncError(error.message);
      } finally {
        setSyncing(false);
      }
    }
    fetchData();
  }, [userId, supabase, key]);

  const setValue = (newValue) => {
    const value = typeof newValue === 'function' ? newValue(localData) : newValue;
    setLocalData(value);
    saveData(key, value);
    debouncedSave(value);
  };

  return [localData, setValue, { syncing, lastSync, syncError }];
}
