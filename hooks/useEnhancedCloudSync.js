import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Cloud Sync Hook with robust error handling, retry mechanisms, and backup systems
 * Designed for 100-year data preservation with smart conflict resolution
 */
export function useEnhancedCloudSync(tableName, initialData = [], userId, supabase) {
  const [data, setData] = useState(initialData);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [backupData, setBackupData] = useState(null);
  const [conflictQueue, setConflictQueue] = useState([]);

  const retryTimeoutRef = useRef(null);
  const syncQueueRef = useRef([]);
  const lastSyncAttemptRef = useRef(null);

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
  const BACKUP_KEY = `backup_${tableName}_${userId}`;
  const CONFLICT_RESOLUTION_WINDOW = 30000; // 30 seconds

  // Enhanced local storage backup system
  const saveToBackup = useCallback((dataToBackup) => {
    try {
      const backup = {
        data: dataToBackup,
        timestamp: Date.now(),
        version: 1,
        checksum: generateChecksum(dataToBackup)
      };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      setBackupData(backup);
    } catch (error) {
      console.error('Failed to save backup:', error);
    }
  }, [BACKUP_KEY]);

  // Generate simple checksum for data integrity
  const generateChecksum = useCallback((data) => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }, []);

  // Load from backup if available
  const loadFromBackup = useCallback(() => {
    try {
      const backupStr = localStorage.getItem(BACKUP_KEY);
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        const isValid = generateChecksum(backup.data) === backup.checksum;
        if (isValid) {
          setBackupData(backup);
          return backup.data;
        } else {
          console.warn('Backup data checksum mismatch, ignoring backup');
          localStorage.removeItem(BACKUP_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load backup:', error);
    }
    return null;
  }, [BACKUP_KEY, generateChecksum]);

  // Smart data merging with conflict detection
  const mergeData = useCallback((localData, remoteData) => {
    if (!Array.isArray(localData) || !Array.isArray(remoteData)) {
      return remoteData || localData || [];
    }

    const merged = new Map();
    const conflicts = [];

    // Process remote data first (cloud is source of truth for resolved conflicts)
    remoteData.forEach(item => {
      if (item && item.id) {
        merged.set(item.id, {
          ...item,
          source: 'remote',
          lastModified: new Date(item.updated_at || item.updatedAt || Date.now())
        });
      }
    });

    // Process local data and detect conflicts
    localData.forEach(item => {
      if (item && item.id) {
        const existing = merged.get(item.id);
        const localModified = new Date(item.updated_at || item.updatedAt || Date.now());

        if (existing) {
          const timeDiff = Math.abs(existing.lastModified - localModified);

          // If modifications are within conflict window and different, mark as conflict
          if (timeDiff < CONFLICT_RESOLUTION_WINDOW &&
              JSON.stringify(existing) !== JSON.stringify(item)) {
            conflicts.push({
              id: item.id,
              local: item,
              remote: existing,
              timestamp: Date.now()
            });
          }

          // Use newest data
          if (localModified > existing.lastModified) {
            merged.set(item.id, {
              ...item,
              source: 'local',
              lastModified: localModified
            });
          }
        } else {
          merged.set(item.id, {
            ...item,
            source: 'local',
            lastModified: localModified
          });
        }
      }
    });

    // Handle conflicts
    if (conflicts.length > 0) {
      setConflictQueue(prev => [...prev, ...conflicts]);
    }

    return Array.from(merged.values());
  }, [CONFLICT_RESOLUTION_WINDOW]);

  // Enhanced sync function with retry logic
  const syncWithRetry = useCallback(async (attempt = 0) => {
    if (!userId || !supabase) return;

    setSyncing(true);
    setSyncError(null);
    lastSyncAttemptRef.current = Date.now();

    try {
      // Fetch remote data
      const { data: remoteData, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Merge with local data
      const currentData = data.length > 0 ? data : loadFromBackup() || [];
      const mergedData = mergeData(currentData, remoteData || []);

      // Update state
      setData(mergedData);
      setLastSync(Date.now());
      setRetryCount(0);

      // Save successful sync to backup
      saveToBackup(mergedData);

      // Clear any pending retries
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

    } catch (error) {
      console.error(`Sync attempt ${attempt + 1} failed:`, error);
      setSyncError(error);

      // Retry logic
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        setRetryCount(attempt + 1);

        retryTimeoutRef.current = setTimeout(() => {
          syncWithRetry(attempt + 1);
        }, delay);
      } else {
        // Max retries reached, fall back to backup
        const backupData = loadFromBackup();
        if (backupData && backupData.length > 0) {
          setData(backupData);
          console.log('Sync failed, using backup data');
        }
        setRetryCount(0);
      }
    } finally {
      setSyncing(false);
    }
  }, [userId, supabase, tableName, data, loadFromBackup, mergeData, saveToBackup]);

  // Manual sync trigger
  const forcSync = useCallback(() => {
    syncWithRetry(0);
  }, [syncWithRetry]);

  // Resolve conflict by choosing local or remote version
  const resolveConflict = useCallback(async (conflictId, useLocal = true) => {
    const conflict = conflictQueue.find(c => c.id === conflictId);
    if (!conflict) return;

    try {
      const resolvedItem = useLocal ? conflict.local : conflict.remote;

      // Update in database
      const { error } = await supabase
        .from(tableName)
        .upsert({
          ...resolvedItem,
          user_id: userId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local data
      setData(prev => prev.map(item =>
        item.id === conflictId ? resolvedItem : item
      ));

      // Remove from conflict queue
      setConflictQueue(prev => prev.filter(c => c.id !== conflictId));

    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  }, [conflictQueue, supabase, tableName, userId]);

  // Auto-resolve conflicts after timeout
  useEffect(() => {
    if (conflictQueue.length > 0) {
      const timeout = setTimeout(() => {
        // Auto-resolve by taking the newest item
        conflictQueue.forEach(conflict => {
          const useLocal = new Date(conflict.local.updated_at || conflict.local.updatedAt) >
                          new Date(conflict.remote.updated_at || conflict.remote.updatedAt);
          resolveConflict(conflict.id, useLocal);
        });
      }, CONFLICT_RESOLUTION_WINDOW);

      return () => clearTimeout(timeout);
    }
  }, [conflictQueue, resolveConflict, CONFLICT_RESOLUTION_WINDOW]);

  // Initial sync and periodic sync
  useEffect(() => {
    if (userId && supabase) {
      // Load backup first
      const backup = loadFromBackup();
      if (backup) {
        setData(backup);
      }

      // Then sync with cloud
      syncWithRetry(0);

      // Set up periodic sync every 30 seconds
      const interval = setInterval(() => {
        syncWithRetry(0);
      }, 30000);

      return () => {
        clearInterval(interval);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [userId, supabase, syncWithRetry, loadFromBackup]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userId || !supabase) return;

    const subscription = supabase
      .channel(`${tableName}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Real-time update received:', payload);

        // Handle real-time updates
        if (payload.eventType === 'INSERT') {
          setData(prev => {
            const exists = prev.find(item => item.id === payload.new.id);
            if (!exists) {
              const newData = [...prev, payload.new];
              saveToBackup(newData);
              return newData;
            }
            return prev;
          });
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => {
            const newData = prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            );
            saveToBackup(newData);
            return newData;
          });
        } else if (payload.eventType === 'DELETE') {
          setData(prev => {
            const newData = prev.filter(item => item.id !== payload.old.id);
            saveToBackup(newData);
            return newData;
          });
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase, tableName, saveToBackup]);

  return [
    data,
    setData,
    {
      syncing,
      lastSync,
      syncError,
      retryCount,
      backupData,
      conflictQueue,
      forceSync: forcSync,
      resolveConflict,
      hasBackup: !!backupData,
      syncHealth: {
        isHealthy: !syncError && retryCount === 0,
        lastAttempt: lastSyncAttemptRef.current,
        nextRetry: retryTimeoutRef.current ? Date.now() + RETRY_DELAYS[retryCount] : null
      }
    }
  ];
}

export default useEnhancedCloudSync;