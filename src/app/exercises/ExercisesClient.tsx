'use client';
import { useDeferredValue, useMemo, useState } from 'react';
import { deleteExercise, submitExerciseForModeration } from '@/actions/exercises';
import { ExerciseFormModal, ExerciseInfoModal, searchExercises } from '@/components/ExerciseModals';
import { PRIMARY_GROUPS } from '@/lib/anatomy';
import type { ExerciseInfo, ExerciseListItem } from '@/lib/types';

export function ExercisesClient({ exercises, userId }: { exercises: ExerciseListItem[]; userId: number }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [info, setInfo] = useState<ExerciseInfo | null>(null);
  const [form, setForm] = useState<{ open: boolean; editing: ExerciseInfo | null }>({ open: false, editing: null });
  const deferredQuery = useDeferredValue(query); // поиск не тормозит ввод

  const filtered = useMemo(() => {
    const byGroup = filter ? exercises.filter((ex) => ex.category === filter || ex.primary_groups.includes(filter)) : exercises;
    return searchExercises(byGroup, deferredQuery);
  }, [exercises, filter, deferredQuery]);

  const mine = filtered.filter((ex) => ex.user_id === userId);
  const global = filtered.filter((ex) => ex.user_id !== userId);

  async function remove(ex: ExerciseListItem) {
    if (!confirm(`Удалить «${ex.name}»?\n\nВНИМАНИЕ: вместе с упражнением удалится вся история его выполнения в тренировках.`)) return;
    await deleteExercise(ex.id);
  }

  async function moderate(id: number) {
    if (!confirm('Отправить на проверку модератору, чтобы упражнение стало общим?')) return;
    await submitExerciseForModeration(id);
  }

  async function share(shareId: string | null) {
    if (!shareId) return;
    await navigator.clipboard.writeText(`${location.origin}/shared/exercise/${shareId}`);
    alert('Ссылка скопирована! Отправьте её другу.');
  }

  const renderGroup = (list: ExerciseListItem[], personal: boolean) => {
    const grouped: Record<string, ExerciseListItem[]> = {};
    for (const ex of list) (grouped[ex.primary_groups[0] ?? ex.category ?? 'Без категории'] ??= []).push(ex);

    return Object.entries(grouped).map(([cat, items]) => (
      <div key={cat} className="mb">
        <h4 className="muted" style={{ marginBottom: 8, fontSize: 13, textTransform: 'uppercase', paddingLeft: 5 }}>
          {cat}
        </h4>
        {items.map((ex) => {
          const tags = [...(ex.primary_groups.length ? ex.primary_groups : ex.category ? [ex.category] : []), ...ex.secondary_muscles];
          return (
            <div key={ex.id} className="card row-between" style={{ padding: '12px 16px' }}>
              <div className="grow" style={{ cursor: 'pointer' }} onClick={() => setInfo(ex)}>
                <div className="bold" style={{ fontSize: 16 }}>
                  {ex.name}
                </div>
                <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
                  {tags.slice(0, 3).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                  {tags.length > 3 && <span className="muted" style={{ fontSize: 10 }}>+{tags.length - 3}</span>}
                </div>
              </div>
              {personal ? (
                <div className="row wrap" style={{ gap: 2, justifyContent: 'flex-end' }}>
                  <span className={`status-badge status-${ex.moderation_status || 'none'}`}>{ex.moderation_status || 'none'}</span>
                  <button className="ghost-btn" title="На модерацию" onClick={() => moderate(ex.id)}>
                    🌐
                  </button>
                  <button className="ghost-btn" title="Поделиться" onClick={() => share(ex.share_id)}>
                    🔗
                  </button>
                  <button className="ghost-btn accent-text" title="Редактировать" onClick={() => setForm({ open: true, editing: ex })}>
                    ✎
                  </button>
                  <button className="ghost-btn danger-text" title="Удалить" onClick={() => remove(ex)}>
                    🗑
                  </button>
                </div>
              ) : (
                <span className="pill">🌍 Общее</span>
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <section className="page">
      <div className="search-bar">
        <div className="card row-between" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>База упражнений</span>
          <button className="plus-btn" onClick={() => setForm({ open: true, editing: null })} aria-label="Новое упражнение">
            +
          </button>
        </div>
        <input className="set-input left" style={{ marginBottom: 12 }} placeholder="🔍 Поиск (например: тяга спина)..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="filters-scroll">
          <button className={`chip-btn${filter === null ? ' active' : ''}`} onClick={() => setFilter(null)}>
            Все
          </button>
          {PRIMARY_GROUPS.map((g) => (
            <button key={g} className={`chip-btn${filter === g ? ' active' : ''}`} onClick={() => setFilter(g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <div className="empty-state">Упражнения не найдены</div>}
      {mine.length > 0 && (
        <>
          <h3 className="mb" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 5 }}>
            👤 Мои упражнения
          </h3>
          {renderGroup(mine, true)}
        </>
      )}
      {global.length > 0 && (
        <>
          <h3 className="mb" style={{ marginTop: 25, borderBottom: '1px solid var(--border-color)', paddingBottom: 5 }}>
            🌍 Общая база
          </h3>
          {renderGroup(global, false)}
        </>
      )}

      <ExerciseInfoModal exercise={info} onClose={() => setInfo(null)} />
      <ExerciseFormModal open={form.open} editing={form.editing} onClose={() => setForm({ open: false, editing: null })} onSaved={() => {}} />
    </section>
  );
}
