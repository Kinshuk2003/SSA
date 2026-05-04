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
      <HTMLTable striped interactive className="ssa-table ssa-table--condensed">
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
              <td className="ssa-name">{row.name}</td>
              <td className="ssa-mono ssa-muted">{row.cospar}</td>
              <td>
                <Tag minimal intent={typeIntent(row.type)} className="ssa-mono">
                  {row.type}
                </Tag>
              </td>
              <td><StatusIndicator value={row.status} /></td>
              <td>{row.owner}</td>
              <td>
                <Tag minimal intent={orbitIntent(row.orbit)} className="ssa-mono">
                  {row.orbit}
                </Tag>
              </td>
              <td className="ssa-mono ssa-muted">{row.launch}</td>
              <td className="ssa-mono-num">{row.period.toFixed(2)}</td>
              <td className="ssa-mono-num">{row.incl.toFixed(2)}</td>
              <td className="ssa-mono-num">
                {row.apogee.toLocaleString()} / {row.perigee.toLocaleString()}
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