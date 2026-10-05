'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { deleteExercise, submitExerciseForModeration } from '@/actions/exercises';
import { ExerciseFormModal, ExerciseInfoModal } from '@/components/ExerciseModals';
import { useRefLabel } from '@/components/RefsProvider';
import { PRIMARY_GROUPS } from '@/lib/anatomy';
import { searchExercises } from '@/lib/search';
import type { ExerciseInfo, ExerciseListItem } from '@/lib/types';

export function ExercisesClient({ exercises, userId }: { exercises: ExerciseListItem[]; userId: number }) {
  const t = useTranslations('exercises');
  const tc = useTranslations('common');
  const locale = useLocale();
  // Reference strings (groups, categories, muscles) are stored in Russian and translated for display only;
  // filtering/grouping above still use the raw values.
  const refLabel = useRefLabel();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [info, setInfo] = useState<ExerciseInfo | null>(null);
  const [form, setForm] = useState<{ open: boolean; editing: ExerciseInfo | null }>({ open: false, editing: null });
  const deferredQuery = useDeferredValue(query); // search does not block typing

  const filtered = useMemo(() => {
    const byGroup = filter ? exercises.filter((ex) => ex.category === filter || ex.primary_groups.includes(filter)) : exercises;
    return searchExercises(byGroup, deferredQuery, locale);
  }, [exercises, filter, deferredQuery, locale]);

  const [mine, global] = useMemo(
    () => [filtered.filter((ex) => ex.user_id === userId), filtered.filter((ex) => ex.user_id !== userId)],
    [filtered, userId],
  );

  async function remove(ex: ExerciseListItem) {
    if (!confirm(t('confirmDelete', { name: ex.name }))) return;
    await deleteExercise(ex.id);
  }

  async function moderate(id: number) {
    if (!confirm(t('confirmModerate'))) return;
    await submitExerciseForModeration(id);
  }

  async function share(shareId: string | null) {
    if (!shareId) return;
    await navigator.clipboard.writeText(`${location.origin}/shared/exercise/${shareId}`);
    alert(t('shareCopied'));
  }

  const renderGroup = (list: ExerciseListItem[], personal: boolean) => {
    const grouped: Record<string, ExerciseListItem[]> = {};
    for (const ex of list) (grouped[ex.primary_groups[0] ?? ex.category ?? t('uncategorized')] ??= []).push(ex);

    return Object.entries(grouped).map(([cat, items]) => (
      <div key={cat} className="mb">
        <h4 className="muted" style={{ marginBottom: 8, fontSize: 13, textTransform: 'uppercase', paddingLeft: 5 }}>
          {refLabel(cat)}
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
                  {tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">
                      {refLabel(tag)}
                    </span>
                  ))}
                  {tags.length > 3 && <span className="muted" style={{ fontSize: 10 }}>+{tags.length - 3}</span>}
                </div>
              </div>
              {personal ? (
                <div className="row wrap" style={{ gap: 2, justifyContent: 'flex-end' }}>
                  <span className={`status-badge status-${ex.moderation_status || 'none'}`}>{ex.moderation_status || 'none'}</span>
                  <button className="ghost-btn" title={tc('moderate')} onClick={() => moderate(ex.id)}>
                    🌐
                  </button>
                  <button className="ghost-btn" title={tc('share')} onClick={() => share(ex.share_id)}>
                    🔗
                  </button>
                  <button className="ghost-btn accent-text" title={tc('edit')} onClick={() => setForm({ open: true, editing: ex })}>
                    ✎
                  </button>
                  <button className="ghost-btn danger-text" title={tc('delete')} onClick={() => remove(ex)}>
                    🗑
                  </button>
                </div>
              ) : (
                <span className="pill">{t('globalBadge')}</span>
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
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{t('title')}</span>
          <button className="plus-btn" onClick={() => setForm({ open: true, editing: null })} aria-label={t('newExercise')}>
            +
          </button>
        </div>
        <input className="set-input left" style={{ marginBottom: 12 }} placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="filters-scroll">
          <button className={`chip-btn${filter === null ? ' active' : ''}`} onClick={() => setFilter(null)}>
            {tc('all')}
          </button>
          {PRIMARY_GROUPS.map((g) => (
            <button key={g} className={`chip-btn${filter === g ? ' active' : ''}`} onClick={() => setFilter(g)}>
              {refLabel(g)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <div className="empty-state">{t('empty')}</div>}
      {mine.length > 0 && (
        <>
          <h3 className="mb" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 5 }}>
            {t('mine')}
          </h3>
          {renderGroup(mine, true)}
        </>
      )}
      {global.length > 0 && (
        <>
          <h3 className="mb" style={{ marginTop: 25, borderBottom: '1px solid var(--border-color)', paddingBottom: 5 }}>
            {t('global')}
          </h3>
          {renderGroup(global, false)}
        </>
      )}

      <ExerciseInfoModal exercise={info} onClose={() => setInfo(null)} />
      <ExerciseFormModal open={form.open} editing={form.editing} onClose={() => setForm({ open: false, editing: null })} onSaved={() => {}} />
    </section>
  );
}
