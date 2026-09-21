'use client';
import { useActionState, useState } from 'react';
import { addMeasurement } from '@/actions/misc';

export function MeasurementForm({ fields }: { fields: { key: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const res = await addMeasurement(prev, fd);
    if (res.ok) setOpen(false);
    return res;
  }, null);

  if (!open)
    return (
      <button className="primary-btn mb" onClick={() => setOpen(true)}>
        + Добавить замер
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
      {state && !state.ok && <div className="error-box mt">{state.error}</div>}
      <div className="row mt">
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Отмена
        </button>
        <button type="submit" className="primary-btn" style={{ padding: 12 }} disabled={pending}>
          {pending ? 'Сохранение...' : '💾 Сохранить'}
        </button>
      </div>
    </form>
  );
}
