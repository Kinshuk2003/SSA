import type { SatelliteForm } from '../types';

export const OBJECT_TYPES  = ['PAYLOAD', 'ROCKET', 'DEBRIS', 'UNKNOWN'] as const;
export const STATUS_VALUES = ['OPERATIONAL', 'PARTIAL', 'DEBRIS', 'DECAYED', 'UNKNOWN'] as const;
export const ORBIT_CLASSES = ['LEO', 'MEO', 'GEO', 'GTO', 'HEO'] as const;

export function defaultForm(): SatelliteForm {
  return {
    norad: '', cospar: '', name: '',
    type: '', status: '', owner: '', orbit: '',
    launch: '',
    period: '', incl: '', apogee: '', perigee: '',
  };
}

export function validateForm(f: SatelliteForm): Record<string, string> {
  const errs: Record<string, string> = {};

  if (!/^\d{4,6}$/.test(f.norad.trim()))
    errs['norad'] = '5-digit catalog ID required';

  if (!/^\d{4}-\d{3}[A-Z]{1,3}$/.test(f.cospar.trim()))
    errs['cospar'] = 'Format YYYY-NNNX (e.g. 1998-067A)';

  if (f.name.trim().length < 2)
    errs['name'] = 'Object name required';

  if (!(OBJECT_TYPES as readonly string[]).includes(f.type))
    errs['type'] = 'Select object type';

  if (!(STATUS_VALUES as readonly string[]).includes(f.status))
    errs['status'] = 'Select status';

  if (!(ORBIT_CLASSES as readonly string[]).includes(f.orbit))
    errs['orbit'] = 'Select orbit class';

  if (f.owner.trim().length < 2)
    errs['owner'] = 'Owner required';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.launch.trim()))
    errs['launch'] = 'ISO date required (YYYY-MM-DD)';

  const p = parseFloat(f.period);
  if (isNaN(p) || p < 80 || p > 1500)
    errs['period'] = 'Period 80–1500 min';

  const i = parseFloat(f.incl);
  if (isNaN(i) || i < 0 || i > 180)
    errs['incl'] = 'Inclination 0–180°';

  const ap = parseFloat(f.apogee);
  const pe = parseFloat(f.perigee);

  if (isNaN(ap) || ap < 100)
    errs['apogee'] = 'Apogee ≥ 100 km';

  if (isNaN(pe) || pe < 100)
    errs['perigee'] = 'Perigee ≥ 100 km';

  if (!isNaN(ap) && !isNaN(pe) && pe > ap)
    errs['perigee'] = 'Perigee must be ≤ apogee';

  return errs;
}
