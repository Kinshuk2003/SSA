import { Icon } from '@blueprintjs/core';
import { FilterPopover } from './FilterPopover';
import type { Column } from '../lib/columns';
import type { FilterCol } from '../types';

interface ColumnHeaderProps {
  col:           Column;
  sortKey:       string;
  sortDir:       'asc' | 'desc';
  onSort:        (key: string) => void;
  filterValues?: string[];
  filterCounts?: Record<string, number>;
  activeFilters?: Set<string>;
  onToggleFilter?: (col: FilterCol, val: string) => void;
  onClearFilter?:  (col: FilterCol) => void;
  openFilter:    string | null;
  setOpenFilter: (key: string | null) => void;
}

export function ColumnHeader({
  col, sortKey, sortDir, onSort,
  filterValues = [], filterCounts = {}, activeFilters = new Set(),
  onToggleFilter, onClearFilter,
  openFilter, setOpenFilter,
}: ColumnHeaderProps) {
  const isSorted       = sortKey === col.key;
  const isFilterActive = activeFilters.size > 0;
  const isOpen         = openFilter === col.key;

  const sortIcon = isSorted ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : 'sort';

  return (
    <th className={col.align === 'right' ? 'ssa-th-num' : ''}>
      <div className="ssa-th-inner">
        <div
          className={`ssa-th-sort${isSorted ? ' ssa-th-sort--active' : ''}${col.align === 'right' ? ' ssa-th-sort--right' : ''}`}
          onClick={() => col.sortable && onSort(col.key)}
          style={{ cursor: col.sortable ? 'pointer' : 'default' }}
        >
          <span>{col.label}</span>
          {col.sortable && <Icon icon={sortIcon as never} size={12} />}
        </div>

        {col.filterable && (
          <>
            <div className="ssa-th-divider" />
            <div
              className={`ssa-th-filter${isFilterActive ? ' ssa-th-filter--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setOpenFilter(isOpen ? null : col.key); }}
            >
              <Icon icon="caret-down" size={12} />
              {isOpen && onToggleFilter && onClearFilter && (
                <FilterPopover
                  colKey={col.key as FilterCol}
                  values={filterValues}
                  counts={filterCounts}
                  active={activeFilters}
                  onToggle={onToggleFilter}
                  onClear={onClearFilter}
                  onClose={() => setOpenFilter(null)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </th>
  );
}
