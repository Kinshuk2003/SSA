import { useState, useEffect, useRef } from 'react';
import { fetchSatellites, type SatelliteListResult } from '../api/client';
import type { FilterCol } from '../types';
import type { Column } from '../lib/columns';

export interface UseSatellitesParams {
  search:     string;
  filters:    Record<FilterCol, Set<string>>;
  sortKey:    string;
  sortOrder:  'asc' | 'desc';
  cursor:     string | null;
  limit:      number;
  columns:    Column[];
}

export interface UseSatellitesResult extends SatelliteListResult {
  isLoading: boolean;
  error:     string | null;
}

export function useSatellites(params: UseSatellitesParams): UseSatellitesResult {
  const [result, setResult] = useState<SatelliteListResult>({ data: [], total: 0, nextCursor: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    setIsLoading(true);
    setError(null);

    const col = params.columns.find((c) => c.key === params.sortKey);

    const typeFilter   = [...(params.filters['type']   ?? [])][0];
    const statusFilter = [...(params.filters['status'] ?? [])][0];
    const orbitFilter  = [...(params.filters['orbit']  ?? [])][0];
    const ownerFilter  = [...(params.filters['owner']  ?? [])][0];

    fetchSatellites({
      search:       params.search || undefined,
      typeFilter,
      statusFilter,
      orbitFilter,
      ownerSearch:  ownerFilter,
      sortApiKey:   col?.sortApiKey,
      sortOrder:    params.sortOrder,
      limit:        params.limit,
      cursor:       params.cursor ?? undefined,
    })
      .then((res) => {
        if (!ctl.signal.aborted) {
          setResult(res);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ctl.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load satellites');
          setIsLoading(false);
        }
      });

    return () => ctl.abort();
  }, [
    params.search,
    params.sortKey,
    params.sortOrder,
    params.cursor,
    params.limit,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(params.filters).map(([k, v]) => [k, [...v].sort()])
      )
    ),
    params.columns,
  ]);

  return { ...result, isLoading, error };
}
