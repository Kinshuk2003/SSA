import { useState, useEffect } from 'react';
import { Icon, Button, Intent } from '@blueprintjs/core';
import { validateForm, defaultForm, OBJECT_TYPES, STATUS_VALUES, ORBIT_CLASSES } from '../lib/validate';
import { createSatellite, ApiError } from '../api/client';
import { showSuccess, showError } from '../lib/toaster';
import type { SatelliteForm } from '../types';

interface AddRecordDrawerProps {
  isOpen:  boolean;
  onClose: () => void;
}

interface FieldGroupProps {
  id:       string;
  label:    string;
  errors:   Record<string, string>;
  full?:    boolean;
  children: React.ReactNode;
}

function FieldGroup({ id, label, errors, full, children }: FieldGroupProps) {
  return (
    <div className={`ssa-field-group${full ? ' ssa-full' : ''}`}>
      <label className="ssa-field-label" htmlFor={id}>
        {label} <span className="ssa-field-required">(required)</span>
      </label>
      {children}
      {errors[id] && <p className="ssa-field-error">{errors[id]}</p>}
    </div>
  );
}

export function AddRecordDrawer({ isOpen, onClose }: AddRecordDrawerProps) {
  const [form,       setForm]       = useState<SatelliteForm>(defaultForm());
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { setForm(defaultForm()); setErrors({}); }
  }, [isOpen]);

  const set = (key: keyof SatelliteForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const errs = validateForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await createSatellite(form);
      await showSuccess('Record injected — catalog updated');
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const fieldErrors = Object.fromEntries(err.details.map((d) => [d.field, d.message]));
        setErrors(fieldErrors);
      } else {
        await showError(err instanceof Error ? err.message : 'Submit failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const errorList = Object.entries(errors);

  if (!isOpen) return null;

  const cls = (id: string, extra?: string) =>
    [`ssa-input`, extra, errors[id] ? 'ssa-input--error' : ''].filter(Boolean).join(' ');

  return (
    <>
      <div className="ssa-drawer-backdrop" onClick={onClose} />

      <div className="ssa-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ssa-drawer-header">
          <div className="ssa-drawer-title-wrap">
            <Icon icon="satellite" className="ssa-drawer-icon" />
            <span className="ssa-drawer-title">New Satellite Record</span>
          </div>
          <button className="ssa-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ssa-drawer-body">
          <p className="ssa-form-section">Identifiers</p>
          <div className="ssa-form-grid">
            <FieldGroup id="norad" label="NORAD ID" errors={errors}>
              <input id="norad" className={cls('norad', 'ssa-mono')} value={form.norad}
                placeholder="25544" onChange={(e) => set('norad', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="cospar" label="COSPAR ID" errors={errors}>
              <input id="cospar" className={cls('cospar', 'ssa-mono')} value={form.cospar}
                placeholder="1998-067A" onChange={(e) => set('cospar', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="name" label="Object Name" errors={errors} full>
              <input id="name" className={cls('name')} value={form.name}
                placeholder="e.g. ISS (ZARYA)" onChange={(e) => set('name', e.target.value)} />
            </FieldGroup>
          </div>

          <p className="ssa-form-section">Classification</p>
          <div className="ssa-form-grid">
            <FieldGroup id="type" label="Object Type" errors={errors}>
              <select id="type" className={`ssa-select${errors['type'] ? ' ssa-input--error' : ''}`}
                value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="">— select —</option>
                {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup id="status" label="Status" errors={errors}>
              <select id="status" className={`ssa-select${errors['status'] ? ' ssa-input--error' : ''}`}
                value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="">— select —</option>
                {STATUS_VALUES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup id="owner" label="Owner" errors={errors}>
              <input id="owner" className={cls('owner')} value={form.owner}
                placeholder="NASA / ESA / SPACEX" onChange={(e) => set('owner', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="orbit" label="Orbit Class" errors={errors}>
              <select id="orbit" className={`ssa-select${errors['orbit'] ? ' ssa-input--error' : ''}`}
                value={form.orbit} onChange={(e) => set('orbit', e.target.value)}>
                <option value="">— select —</option>
                {ORBIT_CLASSES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldGroup>
          </div>

          <p className="ssa-form-section">Orbital Elements</p>
          <div className="ssa-form-grid">
            <FieldGroup id="launch" label="Launch Date" errors={errors} full>
              <input id="launch" className={cls('launch', 'ssa-mono')} value={form.launch}
                placeholder="1998-11-20" onChange={(e) => set('launch', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="period" label="Period (min)" errors={errors}>
              <input id="period" className={cls('period', 'ssa-mono')} value={form.period}
                placeholder="92.94" onChange={(e) => set('period', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="incl" label="Inclination (°)" errors={errors}>
              <input id="incl" className={cls('incl', 'ssa-mono')} value={form.incl}
                placeholder="51.64" onChange={(e) => set('incl', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="apogee" label="Apogee (km)" errors={errors}>
              <input id="apogee" className={cls('apogee', 'ssa-mono')} value={form.apogee}
                placeholder="421" onChange={(e) => set('apogee', e.target.value)} />
            </FieldGroup>
            <FieldGroup id="perigee" label="Perigee (km)" errors={errors}>
              <input id="perigee" className={cls('perigee', 'ssa-mono')} value={form.perigee}
                placeholder="418" onChange={(e) => set('perigee', e.target.value)} />
            </FieldGroup>
          </div>
        </div>

        <div className="ssa-drawer-footer">
          {errorList.length > 0 && (
            <div className="ssa-validation-summary">
              <strong>{errorList.length} validation error{errorList.length > 1 ? 's' : ''}</strong>
              <ul>
                {errorList.slice(0, 4).map(([k, m]) => <li key={k}>{k.toUpperCase()} — {m}</li>)}
                {errorList.length > 4 && <li>+{errorList.length - 4} more</li>}
              </ul>
            </div>
          )}
          <Button
            intent={Intent.PRIMARY}
            icon="send-message"
            text={submitting ? 'Injecting…' : 'Inject Record'}
            loading={submitting}
            large fill
            onClick={() => { void handleSubmit(); }}
          />
        </div>
      </div>
    </>
  );
}