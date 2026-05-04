import { useRef, useEffect } from 'react';
import type { FilterCol } from '../types';

interface FilterPopoverProps {
  colKey:       FilterCol;
  values:       string[];
  counts:       Record<string, number>;
  active:       Set<string>;
  onToggle:     (col: FilterCol, val: string) => void;
  onClear:      (col: FilterCol) => void;
  onClose:      () => void;
}

export function FilterPopover({
  colKey, values, counts, active, onToggle, onClear, onClose,
}: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="ssa-filter-pop" ref={ref} onClick={(e) => e.stopPropagation()}>
      <div className="ssa-filter-pop-head">
        <span>Filter · {colKey}</span>
        {active.size > 0 && (
          <span className="ssa-filter-clear" onClick={() => onClear(colKey)}>Clear</span>
        )}
      </div>
      <div className="ssa-filter-pop-list">
        {values.map((v) => {
          const checked = active.has(v);
          return (
            <div
              key={v}
              className={`ssa-filter-item${checked ? ' ssa-filter-item--checked' : ''}`}
              onClick={() => onToggle(colKey, v)}
            >
              <span className="ssa-filter-cb">
                {checked && <span className="bp5-icon bp5-icon-tick" style={{ fontSize: 9 }} />}
              </span>
              <span className="ssa-filter-label">{v}</span>
              <span className="ssa-filter-count">{counts[v] ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
