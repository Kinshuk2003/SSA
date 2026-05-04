import { Button } from '@blueprintjs/core';

interface PaginationProps {
  page:        number;
  totalPages:  number;
  start:       number; 
  end:         number; 
  total:       number;
  onPrev:      () => void;
  onNext:      () => void;
  hasNext:     boolean;
}

export function Pagination({ page, totalPages, start, end, total, onPrev, onNext, hasNext }: PaginationProps) {
  return (
    <div className="ssa-pagination">
      <span className="ssa-pagination-meta">
        Showing {total === 0 ? 0 : start}–{end} of {total.toLocaleString()} objects
      </span>
      <div className="ssa-pagination-right">
        <span className="ssa-pagination-meta">Page {page} of {totalPages}</span>
        <Button className="ssa-pagination-button" text="← Previous" disabled={page <= 1}  onClick={onPrev} />
        <Button className="ssa-pagination-button" text="Next →"      disabled={!hasNext}  onClick={onNext} />
      </div>
    </div>
  );
}
