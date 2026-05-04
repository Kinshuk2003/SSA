import type { Satellite, PaginatedResponse, SyncStatus as ApiSyncStatus } from '@ssa/shared';
import type {
  ViewSatellite,
  DisplayType,
  DisplayStatus,
  DisplayOrbit,
  DashboardSyncMeta,
  SyncBannerState,
  SatelliteForm,
} from '../types';

const BASE = (import.meta as unknown as { env: Record<string, string> }).env['VITE_API_URL'] ?? '';

function mapType(code: string): DisplayType {
  const m: Record<string, DisplayType> = {
    PAY:  'PAYLOAD',
    'R/B':'ROCKET',
    DEB:  'DEBRIS',
    UNK:  'UNKNOWN',
  };
  return m[code] ?? 'UNKNOWN';
}

function mapStatus(s: Satellite): DisplayStatus {
  if (s.object_type === 'DEB') return 'DEBRIS';

  if (s.decay_date) {
    const decay = new Date(s.decay_date);
    if (!isNaN(decay.getTime()) && decay < new Date()) return 'DECAYED';
  }

  const m: Record<string, DisplayStatus> = {
    '+': 'OPERATIONAL',
    'P': 'PARTIAL',
    '-': 'PARTIAL',
    'N': 'PARTIAL',
    'B': 'PARTIAL',
    'S': 'PARTIAL',
    'X': 'PARTIAL',
  };
  return (s.ops_status ? m[s.ops_status] : undefined) ?? 'UNKNOWN';
}

function mapOrbit(s: Satellite): DisplayOrbit {
  if (s.orbit_type) {
    const m: Record<string, DisplayOrbit> = {
      LEO: 'LEO',
      MEO: 'MEO',
      HEO: 'HEO',
      GEO: 'GEO',
      EL:  deriveOrbitFromAltitude(s.apogee, s.perigee),
    };
    return m[s.orbit_type] ?? deriveOrbitFromAltitude(s.apogee, s.perigee);
  }
  return deriveOrbitFromAltitude(s.apogee, s.perigee);
}

function deriveOrbitFromAltitude(apogee: number | null, perigee: number | null): DisplayOrbit {
  const ap = apogee ?? 0;
  const pe = perigee ?? 0;
  if (ap > 35500 && pe > 34000) return 'GEO';
  if (ap > 35000 && pe < 10000) return 'GTO';
  if (ap > 20000 && pe < 5000)  return 'HEO';
  if (ap > 5000)                return 'MEO';
  return 'LEO';
}


export function toViewSatellite(s: Satellite): ViewSatellite {
  return {
    norad:   String(s.norad_cat_id),
    name:    s.object_name,
    cospar:  s.object_id ?? '—',
    type:    mapType(s.object_type),
    status:  mapStatus(s),
    owner:   s.owner ?? '—',
    orbit:   mapOrbit(s),
    launch:  s.launch_date ?? '—',
    period:  s.period    ?? 0,
    incl:    s.inclination ?? 0,
    apogee:  s.apogee   ?? 0,
    perigee: s.perigee  ?? 0,
  };
}


export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let body: { message?: string; statusCode?: number; details?: Array<{ field: string; message: string }> } = {};
    try { body = await res.json() as typeof body; } catch { /* ignore parse errors */ }
    throw new ApiError(body.message ?? res.statusText, res.status, body.details);
  }

  return res.json() as Promise<T>;
}

const TYPE_TO_API: Record<string, string>   = { PAYLOAD: 'PAY', ROCKET: 'R/B', DEBRIS: 'DEB', UNKNOWN: 'UNK' };
const ORBIT_TO_API: Record<string, string>  = { LEO: 'LEO', MEO: 'MEO', GEO: 'GEO', HEO: 'HEO', GTO: 'EL' };
const STATUS_TO_API: Record<string, string> = { OPERATIONAL: '+', PARTIAL: 'P' };

export interface FetchSatellitesParams {
  search?:     string;
  typeFilter?: string;
  statusFilter?: string;
  orbitFilter?: string;
  ownerSearch?: string;
  sortApiKey?: string;
  sortOrder:   'asc' | 'desc';
  limit:       number;
  cursor?:     string | null;
}

export interface SatelliteListResult {
  data:       ViewSatellite[];
  total:      number;
  nextCursor: string | null;
}

export async function fetchSatellites(params: FetchSatellitesParams): Promise<SatelliteListResult> {
  const qp = new URLSearchParams();

  if (params.search?.trim())      qp.set('search', params.search.trim());
  if (params.typeFilter)          qp.set('object_type', TYPE_TO_API[params.typeFilter] ?? '');
  if (params.orbitFilter)         qp.set('orbit_type',  ORBIT_TO_API[params.orbitFilter] ?? '');
  if (params.ownerSearch?.trim()) qp.set('owner', params.ownerSearch.trim());

  if (params.statusFilter && STATUS_TO_API[params.statusFilter]) {
    qp.set('ops_status', STATUS_TO_API[params.statusFilter] ?? '');
  }

  if (params.sortApiKey)     qp.set('sort_by', params.sortApiKey);
  qp.set('sort_order', params.sortOrder);
  qp.set('limit', String(params.limit));
  if (params.cursor)         qp.set('cursor', params.cursor);

  for (const [k, v] of [...qp.entries()]) {
    if (!v) qp.delete(k);
  }

  const res = await request<PaginatedResponse<Satellite>>(`/api/satellites?${qp}`);
  return {
    data:       res.data.map(toViewSatellite),
    total:      res.total,
    nextCursor: res.nextCursor,
  };
}


export async function fetchSyncStatus(): Promise<DashboardSyncMeta> {
  const raw = await request<ApiSyncStatus>('/api/sync/status');

  const state: SyncBannerState =
    raw.status === 'running' ? 'running' :
    raw.status === 'failed'  ? 'failed'  : 'idle';

  return {
    state,
    lastSyncAt:   raw.started_at   ? new Date(raw.started_at)   : null,
    nextSyncAt:   raw.next_sync_at ? new Date(raw.next_sync_at) : null,
    recordsTotal: raw.records_total,
  };
}

const STATUS_TO_OPS: Record<string, string | null> = {
  OPERATIONAL: '+', PARTIAL: 'P', DECAYED: null, DEBRIS: null, UNKNOWN: null,
};

export async function createSatellite(form: SatelliteForm): Promise<void> {
  const isDecayed = form.status === 'DECAYED';
  await request<Satellite>('/api/satellites', {
    method: 'POST',
    body: JSON.stringify({
      norad_cat_id: parseInt(form.norad, 10),
      object_name:  form.name.trim(),
      object_id:    form.cospar.trim(),
      object_type:  TYPE_TO_API[form.type] ?? 'UNK',
      ops_status:   STATUS_TO_OPS[form.status] ?? null,
      owner:        form.owner.trim() || null,
      launch_date:  form.launch.trim() || null,
      decay_date:   isDecayed ? new Date().toISOString().split('T')[0] : null,
      period:       form.period    ? parseFloat(form.period)    : null,
      inclination:  form.incl      ? parseFloat(form.incl)      : null,
      apogee:       form.apogee    ? parseInt(form.apogee, 10)  : null,
      perigee:      form.perigee   ? parseInt(form.perigee, 10) : null,
    }),
  });
}
