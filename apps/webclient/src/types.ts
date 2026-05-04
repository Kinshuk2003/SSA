export type DisplayType   = 'PAYLOAD' | 'ROCKET' | 'DEBRIS' | 'UNKNOWN';
export type DisplayStatus = 'OPERATIONAL' | 'PARTIAL' | 'DEBRIS' | 'DECAYED' | 'UNKNOWN';
export type DisplayOrbit  = 'LEO' | 'MEO' | 'GEO' | 'GTO' | 'HEO';
export type FilterCol     = 'type' | 'status' | 'owner';

export interface ViewSatellite {
  norad:   string;         // String(norad_cat_id)
  name:    string;         // object_name
  cospar:  string;         // object_id  (COSPAR format 1998-067A)
  type:    DisplayType;
  status:  DisplayStatus;
  owner:   string;         // owner ?? '—'
  orbit:   DisplayOrbit;
  launch:  string;         // launch_date ?? '—'
  period:  number;         // minutes, 2 decimal places
  incl:    number;         // degrees
  apogee:  number;         // km
  perigee: number;         // km
}

export interface SatelliteForm {
  norad:   string;
  cospar:  string;
  name:    string;
  type:    string;
  status:  string;
  owner:   string;
  orbit:   string;
  launch:  string;
  period:  string;
  incl:    string;
  apogee:  string;
  perigee: string;
}

export type SyncBannerState = 'idle' | 'running' | 'failed';

export interface DashboardSyncMeta {
  state:        SyncBannerState;
  lastSyncAt:   Date | null;
  nextSyncAt:   Date | null;
  recordsTotal: number;
}
