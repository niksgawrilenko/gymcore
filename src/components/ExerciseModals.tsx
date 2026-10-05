'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { saveExercise } from '@/actions/exercises';
import { useActionError } from '@/i18n/errors';
import { ANATOMY, PRIMARY_GROUPS } from '@/lib/anatomy';
import type { ExerciseInfo, ExerciseListItem } from '@/lib/types';
import { searchExercises } from '@/lib/search';
import { Modal, ModalHeader } from './Modal';
import { useRefLabel } from './RefsProvider';

// ---------- Exercise info ----------

export function ExerciseInfoModal({ exercise, onClose }: { exercise: ExerciseInfo | null; onClose: () => void }) {
  const t = useTranslations('exerciseInfo');
  const tc = useTranslations('common');
  // Muscle groups, muscles and equipment are data-language strings — translated for display only.
  const refLabel = useRefLabel();
  const ex = exercise;
  return (
    <Modal open={!!ex} onClose={onClose} className="auto" zIndex={1100}>
      {ex && (
        <>
          <ModalHeader title={ex.name} onClose={onClose} />
          <div style={{ padding: '10px 0', fontSize: 15, lineHeight: 1.5 }}>
            <p className="info-row">
              <span className="muted">{t('type')}</span>
              <br />
              <b>{ex.exercise_type === 'cardio' ? t('cardio') : t('strength')}</b>
            </p>
            <p className="info-row">
              <span className="muted">{t('equipment')}</span>
              <br />
              <b>{refLabel(ex.equipment) || t('bodyweight')}</b>
            </p>
            <p className="info-row">
              <span className="muted">{t('primaryMuscles')}</span>
              <br />
              <b className="accent-text">{ex.primary_groups.length ? ex.primary_groups.map((m) => refLabel(m)).join(', ') : refLabel(ex.category) || t('notSpecified')}</b>
            </p>
            <p>
              <span className="muted">{t('secondaryMuscles')}</span>
              <br />
              <b>{ex.secondary_muscles.length ? ex.secondary_muscles.map((m) => refLabel(m)).join(', ') : t('none')}</b>
            </p>
          </div>
          <button type="button" className="primary-btn mt" onClick={onClose}>
            {tc('close')}
          </button>
        </>
      )}
    </Modal>
  );
}

// ---------- Create / edit an exercise ----------

export function ExerciseFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: ExerciseInfo | null; // null = a new exercise
  onClose: () => void;
  onSaved: (ex: ExerciseInfo) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="auto" zIndex={1050}>
      {/* the key re-creates the form on every open -> clean state */}
      {open && <ExerciseForm key={editing?.id ?? 'new'} editing={editing} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function ExerciseForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: ExerciseInfo | null;
  onClose: () => void;
  onSaved: (ex: ExerciseInfo) => void;
}) {
  const t = useTranslations('exerciseForm');
  const tc = useTranslations('common');
  const locale = useLocale();
  const err = useActionError();
  // Chip labels are translated; the values in state stay Russian (the data language) — that is what gets saved.
  const refLabel = useRefLabel();
  const initialPrimary = editing ? (editing.primary_groups.length ? editing.primary_groups : editing.category ? [editing.category] : []) : [];
  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState(editing?.exercise_type === 'cardio' ? 'cardio' : 'strength');
  const [primary, setPrimary] = useState(initialPrimary.filter((m) => PRIMARY_GROUPS.includes(m)));
  const [custom, setCustom] = useState(initialPrimary.filter((m) => !PRIMARY_GROUPS.includes(m)).join(', '));
  const [secondary, setSecondary] = useState<string[]>(editing?.secondary_muscles ?? []);
  const [anatomyOpen, setAnatomyOpen] = useState(secondary.length > 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function submit() {
    const customList = custom.split(',').map((m) => m.trim()).filter(Boolean);
    setSaving(true);
    setError('');
    const res = await saveExercise(
      { name, exercise_type: type as 'strength' | 'cardio', primary_groups: [...primary, ...customList], secondary_muscles: secondary },
      editing?.id,
    );
    setSaving(false);
    if (!res.ok) return setError(err(res.error));
    onSaved(res.data);
    onClose();
  }

  return (
    <>
      <ModalHeader title={editing ? t('editTitle') : t('newTitle')} onClose={onClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 25 }}>
        <div className="field">
          <label>{t('name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} />
          {locale !== 'ru' && (
            <div className="xsmall muted" style={{ marginTop: 4 }}>
              {t('nameHint')}
            </div>
          )}
        </div>

        <div>
          <div className="caps xsmall">{t('primaryGroups')}</div>
          <div className="chip-group">
            {PRIMARY_GROUPS.map((g) => (
              <label key={g}>
                <input type="checkbox" className="chip-checkbox" checked={primary.includes(g)} onChange={() => toggle(primary, setPrimary, g)} />
                <span className="chip-label">{refLabel(g)}</span>
              </label>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>{t('customMuscles')}</label>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t('customPlaceholder')} />
          </div>
        </div>

        <div>
          <button type="button" className="ghost-btn accent-text bold" style={{ fontSize: 13, padding: 0 }} onClick={() => setAnatomyOpen(!anatomyOpen)}>
            {anatomyOpen ? '▼' : '▶'} {t('anatomy')}
          </button>
          {anatomyOpen && (
            <div className="anatomy-details open" style={{ background: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 8 }}>
              {PRIMARY_GROUPS.map((group) => (
                <div key={group} style={{ marginBottom: 8 }}>
                  <div className="xsmall bold">{refLabel(group)}</div>
                  <div className="chip-group">
                    {ANATOMY[group].map((m) => (
                      <label key={m}>
                        <input type="checkbox" className="chip-checkbox" checked={secondary.includes(m)} onChange={() => toggle(secondary, setSecondary, m)} />
                        <span className="chip-label" style={{ fontSize: 11 }}>
                          {refLabel(m)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>{t('exerciseType')}</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="strength">{t('typeStrength')}</option>
            <option value="cardio">{t('typeCardio')}</option>
          </select>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <button type="button" className="primary-btn" disabled={saving} onClick={submit}>
        {saving ? '⏳...' : tc('save')}
      </button>
    </>
  );
}

// ---------- Exercise picker (multi-word search: "back row") ----------
export function ExercisePicker({
  open,
  title,
  exercises,
  onClose,
  onPick,
}: {
  open: boolean;
  title?: string;
  exercises: ExerciseListItem[];
  onClose: () => void;
  onPick: (ex: ExerciseInfo) => void;
}) {
  const t = useTranslations('exercisePicker');
  const locale = useLocale();
  const refLabel = useRefLabel();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const results = useMemo(() => searchExercises(exercises, query, locale), [exercises, query, locale]);

  const pick = (ex: ExerciseInfo) => {
    onPick(ex);
    setQuery('');
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <ModalHeader title={title ?? t('title')} onClose={onClose}>
          <button type="button" className="plus-btn" style={{ padding: 0 }} onClick={() => setFormOpen(true)}>
            +
          </button>
        </ModalHeader>
        <input
          className="set-input left mb"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="modal-list">
          {results.length === 0 && <div className="empty-state">{t('notFound')}</div>}
          {results.map((ex) => (
            <div key={ex.id} className="exercise-list-item" onClick={() => pick(ex)}>
              <b>{ex.name}</b>
              <br />
              <small className="muted">{refLabel(ex.primary_groups[0] ?? ex.category) || t('uncategorized')}</small>
            </div>
          ))}
        </div>
      </Modal>
      <ExerciseFormModal open={formOpen} editing={null} onClose={() => setFormOpen(false)} onSaved={pick} />
    </>
  );
}
