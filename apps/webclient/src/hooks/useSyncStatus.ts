import { useState, useEffect } from 'react';
import { fetchSyncStatus } from '../api/client';
import type { DashboardSyncMeta } from '../types';

const POLL_INTERVAL_MS = 30_000;

const DEFAULT: DashboardSyncMeta = {
  state:        'idle',
  lastSyncAt:   null,
  nextSyncAt:   null,
  recordsTotal: 0,
};

export function useSyncStatus(): DashboardSyncMeta {
  const [meta, setMeta] = useState<DashboardSyncMeta>(DEFAULT);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchSyncStatus();
        if (!cancelled) setMeta(data);
      } catch {
        // Network failure on poll — keep last known state, no error
      }
    };

    void load();
    const id = setInterval(() => { void load(); }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return meta;
}
