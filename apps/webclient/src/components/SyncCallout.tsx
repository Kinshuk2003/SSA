import { Callout, Button, Intent, Spinner, SpinnerSize } from '@blueprintjs/core';
import type { SyncBannerState, DashboardSyncMeta } from '../types';

function fmtUTC(d: Date | null): string {
  if (!d) return '—';
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

const INTENT_MAP: Record<SyncBannerState, Intent> = {
  idle:    Intent.PRIMARY,
  running: Intent.WARNING,
  failed:  Intent.DANGER,
};

const TITLE_MAP: Record<SyncBannerState, string> = {
  idle:    'Catalog up to date',
  running: 'Catalog sync in progress',
  failed:  'Catalog sync failed',
};

interface SyncCalloutProps extends DashboardSyncMeta {
  onTrigger: () => void;
}

export function SyncCallout({ state, lastSyncAt, nextSyncAt, recordsTotal, onTrigger }: SyncCalloutProps) {
  return (
    <Callout
      className="ssa-sync-callout"
      intent={INTENT_MAP[state]}
      icon={
        state === 'running'
          ? <Spinner size={SpinnerSize.SMALL} intent={Intent.WARNING} />
          : state === 'failed' ? 'warning-sign' : 'info-sign'
      }
    >
      <div className="ssa-sync-inner">
        <strong className="ssa-sync-title">{TITLE_MAP[state]}</strong>

        <div className="ssa-sync-meta">
          <span><span className="ssa-meta-key">LAST</span><span className="ssa-meta-val">{fmtUTC(lastSyncAt)}</span></span>
          <span><span className="ssa-meta-key">NEXT</span><span className="ssa-meta-val">{fmtUTC(nextSyncAt)}</span></span>
          <span><span className="ssa-meta-key">OBJECTS</span><span className="ssa-meta-val">{recordsTotal.toLocaleString()}</span></span>
          {state === 'failed' && (
            <span><span className="ssa-meta-key">CODE</span><span className="ssa-meta-val ssa-meta-val--err">ERR_TIMEOUT_18-T</span></span>
          )}
        </div>

        <span style={{ flex: 1 }} />

        <div className="ssa-sync-trigger-wrap">
          <Button
            icon="refresh"
            text="Retry sync"
            intent={state === 'failed' ? Intent.DANGER : Intent.NONE}
            disabled={state !== 'failed'}
            onClick={onTrigger}
            title={state !== 'failed' ? 'Only retriggers if the last sync failed or did not run' : undefined}
          />
          {state !== 'failed' && (
            <span className="ssa-sync-trigger-hint">
              {state === 'running' ? 'Sync in progress…' : 'Runs automatically on schedule'}
            </span>
          )}
        </div>
      </div>
    </Callout>
  );
}
