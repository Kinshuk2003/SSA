import { useState, useMemo, useCallback } from 'react';
import { Spinner } from '@blueprintjs/core';
import { AppNavbar }        from './components/Navbar';
import { SyncCallout }      from './components/SyncCallout';
import { Toolbar }          from './components/Toolbar';
import { SatelliteTable }   from './components/SatelliteTable';
import { Pagination }       from './components/Pagination';
import { AddRecordDrawer }  from './components/AddRecordDrawer';
import { useSatellites }    from './hooks/useSatellites';
import { useSyncStatus }    from './hooks/useSyncStatus';
import { COLUMNS, FILTER_COLS } from './lib/columns';
import { showSuccess } from './lib/toaster';
import type { FilterCol } from './types';

const PAGE_SIZE = 100;

function emptyFilters(): Record<FilterCol, Set<string>> {
  return { type: new Set(), status: new Set(), owner: new Set(), orbit: new Set() };
}

export function Dashboard() {
  const [search,      setSearch]      = useState('');
  const [sortKey,     setSortKey]     = useState('norad');
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [filters,     setFilters]     = useState<Record<FilterCol, Set<string>>>(emptyFilters);
  const [openFilter,  setOpenFilter]  = useState<string | null>(null);

  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [page,        setPage]        = useState(1);

  const currentCursor = cursorStack[page - 1] ?? null;

  const [drawerOpen, setDrawerOpen] = useState(false);

  const polled = useSyncStatus();

  const apiSortKey = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    return col?.sortApiKey;
  }, [sortKey]);

  const { data, total, nextCursor, isLoading, error } = useSatellites({
    search,
    filters,
    sortKey,
    sortOrder: sortDir,
    cursor:    currentCursor,
    limit:     PAGE_SIZE,
    columns:   COLUMNS,
  });

  const rows = useMemo(() => {
    if (apiSortKey) return data; // server already sorted

    return [...data].sort((a, b) => {
      const av = a[sortKey as keyof typeof a] as string | number;
      const bv = b[sortKey as keyof typeof b] as string | number;
      if (typeof av === 'number') {
        return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, apiSortKey]);

  
  const filterValues = useMemo(
    () => ({
      type:   [...new Set(data.map((d) => d.type))].sort(),
      status: [...new Set(data.map((d) => d.status))].sort(),
      owner:  [...new Set(data.map((d) => d.owner))].sort(),
      orbit:  [...new Set(data.map((d) => d.orbit))].sort(),
    }),
    [data]
  );

  const filterCounts = useMemo(() => {
    const out: Record<FilterCol, Record<string, number>> = {
      type: {}, status: {}, owner: {}, orbit: {},
    };
    for (const d of data) {
      for (const col of FILTER_COLS) {
        const v = d[col];
        out[col][v] = (out[col][v] ?? 0) + 1;
      }
    }
    return out;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart  = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd    = Math.min(total, page * PAGE_SIZE);

  const resetPagination = () => { setPage(1); setCursorStack([null]); };

  const onSearchChange = useCallback((val: string) => {
    setSearch(val);
    resetPagination();
  }, []); 

  const onSort = useCallback((key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    resetPagination();
  }, [sortKey]);

  const onToggleFilter = useCallback((col: FilterCol, val: string) => {
    setFilters((prev) => {
      const next = { ...prev, [col]: new Set(prev[col]) };
      if (next[col].has(val)) next[col].delete(val);
      else next[col].add(val);
      return next;
    });
    resetPagination();
  }, []);

  const onClearFilter = useCallback((col: FilterCol) => {
    setFilters((prev) => ({ ...prev, [col]: new Set() }));
    resetPagination();
  }, []);

  const onClearAll = useCallback(() => {
    setSearch('');
    setFilters(emptyFilters());
    resetPagination();
  }, []); 

  const onNextPage = useCallback(() => {
    if (!nextCursor) return;
    const newStack = [...cursorStack];
    newStack[page] = nextCursor;
    setCursorStack(newStack);
    setPage((p) => p + 1);
  }, [nextCursor, cursorStack, page]);

  const onPrevPage = useCallback(() => {
    if (page <= 1) return;
    setPage((p) => p - 1);
  }, [page]);

  const onTriggerSync = useCallback(() => {
    setTimeout(async () => {
      await showSuccess('Sync complete — catalog updated');
    }, 3500);
  }, []);

  return (
    <div className="bp5-dark ssa-app" onClick={() => setOpenFilter(null)}>
      <AppNavbar
        search={search}
        onSearchChange={onSearchChange}
        onAddRecord={() => setDrawerOpen(true)}
      />

      {error && (
        <div className="ssa-error-banner">
          Failed to load satellites: {error}
        </div>
      )}

      <SyncCallout
        state={polled.state}
        lastSyncAt={polled.lastSyncAt}
        nextSyncAt={polled.nextSyncAt}
        recordsTotal={polled.recordsTotal}
        onTrigger={onTriggerSync}
      />

      <Toolbar
        search={search}
        filters={filters}
        onRemoveFilter={onToggleFilter}
        onClearAll={onClearAll}
      />

      {isLoading && rows.length === 0 && (
        <div className="ssa-loading"><Spinner /></div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        start={pageStart}
        end={pageEnd}
        total={total}
        onPrev={onPrevPage}
        onNext={onNextPage}
        hasNext={nextCursor !== null}
      />

      <SatelliteTable
        rows={rows}
        isLoading={isLoading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        filters={filters}
        filterValues={filterValues}
        filterCounts={filterCounts}
        onToggleFilter={onToggleFilter}
        onClearFilter={onClearFilter}
        openFilter={openFilter}
        setOpenFilter={setOpenFilter}
      />

      <AddRecordDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
