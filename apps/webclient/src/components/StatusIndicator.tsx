import { statusVariant, STATUS_DOT_COLOR } from '../lib/intent';
import type { DisplayStatus } from '../types';

interface StatusIndicatorProps {
  value:    DisplayStatus;
  running?: boolean;
}

export function StatusIndicator({ value, running = false }: StatusIndicatorProps) {
  const variant = statusVariant(value);
  const dotColor = STATUS_DOT_COLOR[variant];

  return (
    <span className={`ssa-status${running ? ' ssa-status--running' : ''}`}>
      <span className="ssa-status-dot" style={{ background: dotColor }} />
      <span style={{ fontSize: 13, color: '#f6f7f9' }}>{value}</span>
    </span>
  );
}
