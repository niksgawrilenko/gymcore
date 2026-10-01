'use client';
import { useMemo, useState } from 'react';
import { saveExercise } from '@/actions/exercises';
import { ANATOMY, PRIMARY_GROUPS } from '@/lib/anatomy';
import type { ExerciseInfo, ExerciseListItem } from '@/lib/types';
import { Modal, ModalHeader } from './Modal';

// ---------- Информация об упражнении ----------

export function ExerciseInfoModal({ exercise, onClose }: { exercise: ExerciseInfo | null; onClose: () => void }) {
  const ex = exercise;
  return (
    <Modal open={!!ex} onClose={onClose} className="auto" zIndex={1100}>
      {ex && (
        <>
          <ModalHeader title={ex.name} onClose={onClose} />
          <div style={{ padding: '10px 0', fontSize: 15, lineHeight: 1.5 }}>
            <p className="info-row">
              <span className="muted">Тип:</span>
              <br />
              <b>{ex.exercise_type === 'cardio' ? 'Кардио' : 'Силовое'}</b>
            </p>
            <p className="info-row">
              <span className="muted">Оборудование:</span>
              <br />
              <b>{ex.equipment || 'Собственный вес / Без оборудования'}</b>
            </p>
            <p className="info-row">
              <span className="muted">Основные мышцы:</span>
              <br />
              <b className="accent-text">{ex.primary_groups.length ? ex.primary_groups.join(', ') : ex.category || 'Не указано'}</b>
            </p>
            <p>
              <span className="muted">Дополнительные мышцы:</span>
              <br />
              <b>{ex.secondary_muscles.length ? ex.secondary_muscles.join(', ') : 'Нет'}</b>
            </p>
          </div>
          <button type="button" className="primary-btn mt" onClick={onClose}>
            Закрыть
          </button>
        </>
      )}
    </Modal>
  );
}

// ---------- Создание / правка упражнения ----------

export function ExerciseFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: ExerciseInfo | null; // null = новое
  onClose: () => void;
  onSaved: (ex: ExerciseInfo) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="auto" zIndex={1050}>
      {/* key пересоздаёт форму при каждом открытии -> чистое состояние */}
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
    if (!res.ok) return setError(res.error);
    onSaved(res.data);
    onClose();
  }

  return (
    <>
      <ModalHeader title={editing ? 'Правка упражнения' : 'Новое упражнение'} onClose={onClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 25 }}>
        <div className="field">
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Жим лежа" />
        </div>

        <div>
          <div className="caps xsmall">Основные группы (можно несколько)</div>
          <div className="chip-group">
            {PRIMARY_GROUPS.map((g) => (
              <label key={g}>
                <input type="checkbox" className="chip-checkbox" checked={primary.includes(g)} onChange={() => toggle(primary, setPrimary, g)} />
                <span className="chip-label">{g}</span>
              </label>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Свои мышцы (через запятую)</label>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Например: Брахиалис, Камбаловидная" />
          </div>
        </div>

        <div>
          <button type="button" className="ghost-btn accent-text bold" style={{ fontSize: 13, padding: 0 }} onClick={() => setAnatomyOpen(!anatomyOpen)}>
            {anatomyOpen ? '▼' : '▶'} Детальная анатомия (опционально)
          </button>
          {anatomyOpen && (
            <div className="anatomy-details open" style={{ background: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 8 }}>
              {PRIMARY_GROUPS.map((group) => (
                <div key={group} style={{ marginBottom: 8 }}>
                  <div className="xsmall bold">{group}</div>
                  <div className="chip-group">
                    {ANATOMY[group].map((m) => (
                      <label key={m}>
                        <input type="checkbox" className="chip-checkbox" checked={secondary.includes(m)} onChange={() => toggle(secondary, setSecondary, m)} />
                        <span className="chip-label" style={{ fontSize: 11 }}>
                          {m}
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
          <label>Тип тренировки</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="strength">Силовое (Вес + Повторы)</option>
            <option value="cardio">Кардио (Время + Расстояние)</option>
          </select>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <button type="button" className="primary-btn" disabled={saving} onClick={submit}>
        {saving ? '⏳...' : 'Сохранить'}
      </button>
    </>
  );
}

// ---------- Выбор упражнения (поиск по словам: «тяга спина») ----------

export function searchExercises<T extends ExerciseInfo & { usage_count?: number }>(list: T[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? list.filter((ex) => {
        const text = [ex.name, ex.category, ...ex.primary_groups, ...ex.secondary_muscles].join(' ').toLowerCase();
        return terms.every((t) => text.includes(t));
      })
    : list;
  // Сначала то, что делаешь чаще всего
  return [...filtered].sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0) || a.name.localeCompare(b.name, 'ru'));
}

export function ExercisePicker({
  open,
  title = 'Упражнения',
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
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const results = useMemo(() => searchExercises(exercises, query), [exercises, query]);

  const pick = (ex: ExerciseInfo) => {
    onPick(ex);
    setQuery('');
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <ModalHeader title={title} onClose={onClose}>
          <button type="button" className="plus-btn" style={{ padding: 0 }} onClick={() => setFormOpen(true)}>
            +
          </button>
        </ModalHeader>
        <input
          className="set-input left mb"
          placeholder="🔍 Поиск (тяга спина)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="modal-list">
          {results.length === 0 && <div className="empty-state">Не найдено</div>}
          {results.map((ex) => (
            <div key={ex.id} className="exercise-list-item" onClick={() => pick(ex)}>
              <b>{ex.name}</b>
              <br />
              <small className="muted">{ex.primary_groups[0] ?? ex.category ?? 'Без категории'}</small>
            </div>
          ))}
        </div>
      </Modal>
      <ExerciseFormModal open={formOpen} editing={null} onClose={() => setFormOpen(false)} onSaved={pick} />
    </>
  );
}
