import { HTMLTable, Tag, NonIdealState } from '@blueprintjs/core';
import { ColumnHeader } from './ColumnHeader';
import { StatusIndicator } from './StatusIndicator';
import { COLUMNS } from '../lib/columns';
import { typeIntent, orbitIntent } from '../lib/intent';
import type { ViewSatellite, FilterCol } from '../types';

interface SatelliteTableProps {
  rows:           ViewSatellite[];
  isLoading:      boolean;
  sortKey:        string;
  sortDir:        'asc' | 'desc';
  onSort:         (key: string) => void;
  filters:        Record<FilterCol, Set<string>>;
  filterValues:   Record<FilterCol, string[]>;
  filterCounts:   Record<FilterCol, Record<string, number>>;
  onToggleFilter: (col: FilterCol, val: string) => void;
  onClearFilter:  (col: FilterCol) => void;
  openFilter:     string | null;
  setOpenFilter:  (key: string | null) => void;
}

export function SatelliteTable({
  rows, isLoading,
  sortKey, sortDir, onSort,
  filters, filterValues, filterCounts,
  onToggleFilter, onClearFilter,
  openFilter, setOpenFilter,
}: SatelliteTableProps) {
  return (
    <div className="ssa-table-wrap">
      <HTMLTable striped interactive className="ssa-table">
        <colgroup>
          <col className="ssa-col-norad" />
          <col className="ssa-col-name" />
          <col className="ssa-col-cospar" />
          <col className="ssa-col-type" />
          <col className="ssa-col-status" />
          <col className="ssa-col-owner" />
          <col className="ssa-col-orbit" />
          <col className="ssa-col-launch" />
          <col className="ssa-col-period" />
          <col className="ssa-col-incl" />
          <col className="ssa-col-appe" />
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <ColumnHeader
                key={col.key}
                col={col}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                filterValues={col.filterable ? (filterValues[col.key as FilterCol] ?? []) : []}
                filterCounts={col.filterable ? (filterCounts[col.key as FilterCol] ?? {}) : {}}
                activeFilters={col.filterable ? (filters[col.key as FilterCol] ?? new Set()) : new Set()}
                onToggleFilter={onToggleFilter}
                onClearFilter={onClearFilter}
                openFilter={openFilter}
                setOpenFilter={setOpenFilter}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.norad}>
              <td className="ssa-mono ssa-muted">{row.norad}</td>
              <td className="ssa-name" title={row.name}>{row.name}</td>
              <td className="ssa-mono ssa-muted">{row.cospar}</td>
              <td>
                <Tag minimal intent={typeIntent(row.type)} className="ssa-mono">
                  {row.type}
                </Tag>
              </td>
              <td><StatusIndicator value={row.status} /></td>
              <td title={row.owner ?? undefined}>{row.owner}</td>
              <td>
                <Tag minimal intent={orbitIntent(row.orbit)} className="ssa-mono">
                  {row.orbit}
                </Tag>
              </td>
              <td className="ssa-mono ssa-muted">{row.launch}</td>
              <td className="ssa-mono-num">{row.period != null ? row.period.toFixed(2) : '—'}</td>
              <td className="ssa-mono-num">{row.incl != null ? row.incl.toFixed(2) : '—'}</td>
              <td className="ssa-mono-num">
                {row.apogee != null ? row.apogee.toLocaleString() : '—'} / {row.perigee != null ? row.perigee.toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>

      {!isLoading && rows.length === 0 && (
        <NonIdealState
          className="ssa-empty"
          icon="satellite"
          title="No objects found"
          description="Try adjusting your search query or clearing one of the active filters above."
        />
      )}
    </div>
  );
}