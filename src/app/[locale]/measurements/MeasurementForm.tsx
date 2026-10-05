'use client';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { addMeasurement } from '@/actions/misc';
import { useActionError } from '@/i18n/errors';

export function MeasurementForm({ fields }: { fields: { key: string; label: string }[] }) {
  const t = useTranslations('measurements');
  const tc = useTranslations('common');
  const err = useActionError();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const res = await addMeasurement(prev, fd);
    if (res.ok) setOpen(false);
    return res;
  }, null);

  if (!open)
    return (
      <button className="primary-btn mb" onClick={() => setOpen(true)}>
        {t('add')}
      </button>
    );

  return (
    <form action={action} className="card" style={{ padding: 15, marginBottom: 20 }}>
      <div className="grid-2" style={{ gap: 10 }}>
        {fields.map((f) => (
          <div key={f.key} className="field">
            <label htmlFor={`m_${f.key}`}>{f.label}</label>
            <input id={`m_${f.key}`} name={f.key} type="number" step="0.1" inputMode="decimal" />
          </div>
        ))}
      </div>
      {state && !state.ok && <div className="error-box mt">{err(state.error)}</div>}
      <div className="row mt">
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          {tc('cancel')}
        </button>
        <button type="submit" className="primary-btn" style={{ padding: 12 }} disabled={pending}>
          {pending ? tc('saving') : `💾 ${tc('save')}`}
        </button>
      </div>
    </form>
  );
}
