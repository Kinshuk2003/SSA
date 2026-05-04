import { Button, Tag, Intent } from '@blueprintjs/core';
import type { FilterCol } from '../types';

interface ToolbarProps {
  search:         string;
  filters:        Record<FilterCol, Set<string>>;
  onRemoveFilter: (col: FilterCol, val: string) => void;
  onClearAll:     () => void;
}

export function Toolbar({ search, filters, onRemoveFilter, onClearAll }: ToolbarProps) {
  const chips: Array<{ col: FilterCol; val: string }> = [];
  for (const col of ['type', 'status', 'owner'] as FilterCol[]) {
    for (const val of filters[col]) {
      chips.push({ col, val });
    }
  }

  const hasFilters = search.length > 0 || chips.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="ssa-toolbar">
      {chips.map(({ col, val }) => (
        <Tag
          key={`${col}-${val}`}
          className="ssa-chip"
          minimal
          intent={Intent.PRIMARY}
          onRemove={() => onRemoveFilter(col, val)}
        >
          <span className="ssa-chip-key">{col}=</span>{val}
        </Tag>
      ))}

      <Button
        minimal
        intent={Intent.DANGER}
        icon="cross"
        text="Clear all filters"
        onClick={onClearAll}
      />
    </div>
  );
}
