import type { DisplayType, DisplayOrbit, DisplayStatus } from '../types';

export type Intent = 'primary' | 'success' | 'warning' | 'danger' | 'none';
export type StatusVariant = 'ok' | 'warn' | 'err' | 'neu';

export function typeIntent(t: DisplayType): Intent {
  const map: Record<DisplayType, Intent> = {
    PAYLOAD: 'success',
    ROCKET:  'warning',
    DEBRIS:  'danger',
    UNKNOWN: 'none',
  };
  return map[t] ?? 'none';
}

export function orbitIntent(o: DisplayOrbit): Intent {
  const map: Record<DisplayOrbit, Intent> = {
    LEO: 'primary',
    MEO: 'success',
    GEO: 'warning',
    GTO: 'warning',
    HEO: 'none',
  };
  return map[o] ?? 'none';
}

export function statusVariant(s: DisplayStatus): StatusVariant {
  const map: Record<DisplayStatus, StatusVariant> = {
    OPERATIONAL: 'ok',
    PARTIAL:     'warn',
    DEBRIS:      'err',
    DECAYED:     'err',
    UNKNOWN:     'neu',
  };
  return map[s] ?? 'neu';
}

export const STATUS_DOT_COLOR: Record<StatusVariant, string> = {
  ok:  'var(--pt-intent-success-2, #32a467)',
  warn:'var(--pt-intent-warning-2, #ec9a3c)',
  err: 'var(--pt-intent-danger-2,  #e76a6e)',
  neu: 'var(--pt-gray-2,           #8f99a8)',
};
