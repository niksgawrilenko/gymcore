'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { saveWorkout } from '@/actions/workouts';
import { formatElapsed, useNow } from '@/components/Chrome';
import { ExerciseListEditor } from '@/components/ExerciseListEditor';
import { MediaSection, uploadPending, type PendingMedia } from '@/components/MediaSection';
import { clearDraft, loadDraft, pendingMedia, saveDraft } from '@/lib/draft';
import { toLocalInputValue } from '@/lib/dates';
import { toEditorExercises, toSavePayload, type ExerciseListItem, type PrevSetsMap, type WorkoutDraft } from '@/lib/types';

type Template = { id: number; name: string; exercises: Parameters<typeof toEditorExercises>[0] } | null;

export function ActiveWorkout({
  exercises,
  prevSets,
  template,
  startNew,
  date,
}: {
  exercises: ExerciseListItem[];
  prevSets: PrevSetsMap;
  template: Template;
  startNew: boolean;
  date: number | null;
}) {
  const router = useRouter();
  // Компонент рендерится только в браузере (см. ActiveWorkoutLoader), поэтому localStorage доступен сразу
  const [draft, setDraft] = useState<WorkoutDraft>(
    () =>
      (!startNew && loadDraft()) || {
        title: template?.name ?? 'Свободная тренировка',
        template_id: template?.id ?? null,
        workout_date: date ?? Date.now(),
        exercises: toEditorExercises(template?.exercises ?? []),
        media: [],
      },
  );
  const [pending, setPendingState] = useState<PendingMedia[]>(() => [...pendingMedia]);
  const [saving, setSaving] = useState('');
  const now = useNow();

  useEffect(() => {
    saveDraft(draft);
    // Убираем ?new/?template из адреса: обновление страницы не пересоздаст тренировку
    if (startNew || template || date) router.replace('/workout');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<WorkoutDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    saveDraft(next);
  };

  const setPending = (list: PendingMedia[]) => {
    pendingMedia.splice(0, pendingMedia.length, ...list);
    setPendingState(list);
  };

  function cancel() {
    if (!confirm('Сбросить текущую активную тренировку? Все несохраненные данные и таймер будут удалены.')) return;
    clearDraft();
    router.push('/templates');
  }

  async function save() {
    try {
      let media = draft!.media;
      if (pending.length) {
        setSaving('Загрузка фото...');
        media = [...media, ...(await uploadPending(pending))];
        update({ media });
        setPending([]);
      }
      setSaving('Сохранение...');
      const res = await saveWorkout({
        title: draft!.title,
        workout_date: draft!.workout_date,
        template_id: draft!.template_id,
        exercises: toSavePayload(draft!.exercises),
        media,
      });
      if (!res.ok) return alert(res.error);
      clearDraft();
      router.push('/');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving('');
    }
  }

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/" className="back-link">
          ← Назад
        </Link>
        <div className="row">
          <button className="btn btn-danger" onClick={cancel}>
            ❌ Отменить
          </button>
          <button className="btn btn-success" onClick={save} disabled={!!saving}>
            {saving || '💾 Сохранить'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <input className="set-input title-input" value={draft.title} onChange={(e) => update({ title: e.target.value })} />
        <input
          type="datetime-local"
          className="set-input left"
          value={toLocalInputValue(draft.workout_date)}
          onChange={(e) => e.target.value && update({ workout_date: new Date(e.target.value).getTime() })}
        />
        <div className="timer">{formatElapsed(now - draft.workout_date)}</div>
      </div>

      <ExerciseListEditor
        exercises={draft.exercises}
        onChange={(list) => update({ exercises: list })}
        editing
        prevSets={prevSets}
        allExercises={exercises}
      />

      <MediaSection media={draft.media} pending={pending} editing onMediaChange={(media) => update({ media })} onPendingChange={setPending} />
    </section>
  );
}
