'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { saveWorkout } from '@/actions/workouts';
import { formatElapsed, useNow } from '@/components/Chrome';
import { ExerciseListEditor } from '@/components/ExerciseListEditor';
import { MediaSection, uploadPending } from '@/components/MediaSection';
import { useActionError } from '@/i18n/errors';
import { clearDraft, loadDraft, pendingMedia, saveDraft } from '@/lib/draft';
import { toLocalInputValue } from '@/lib/dates';
import {
  toEditorExercises,
  toSavePayload,
  type ExerciseListItem,
  type PendingMedia,
  type PrevSetsMap,
  type WorkoutDraft,
} from '@/lib/types';

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
  const t = useTranslations('workout');
  const tc = useTranslations('common');
  const err = useActionError();
  // Rendered in the browser only (see ActiveWorkoutLoader), so localStorage is available right away
  const [draft, setDraft] = useState<WorkoutDraft>(
    () =>
      (!startNew && loadDraft(t('freeWorkout'))) || {
        title: template?.name ?? t('freeWorkout'),
        template_id: template?.id ?? null,
        workout_date: date ?? Date.now(),
        exercises: toEditorExercises(template?.exercises ?? []),
        media: [],
      },
  );
  const [pending, setPendingState] = useState<PendingMedia[]>(() => [...pendingMedia]);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    saveDraft(draft);
    // Strip ?new/?template from the URL so a reload does not re-create the workout
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
    if (!confirm(t('confirmCancel'))) return;
    clearDraft();
    router.push('/templates');
  }

  async function save() {
    try {
      let media = draft!.media;
      if (pending.length) {
        setSaving(tc('loadPhoto'));
        media = [...media, ...(await uploadPending(pending))];
        update({ media });
        setPending([]);
      }
      setSaving(tc('saving'));
      const res = await saveWorkout({
        title: draft!.title,
        workout_date: draft!.workout_date,
        template_id: draft!.template_id,
        exercises: toSavePayload(draft!.exercises),
        media,
      });
      if (!res.ok) return alert(err(res.error));
      clearDraft();
      router.push('/');
    } catch (e) {
      alert(e instanceof Error ? err(e.message) : err('saveFailed'));
    } finally {
      setSaving('');
    }
  }

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/" className="back-link">
          ← {tc('back')}
        </Link>
        <div className="row">
          <button className="btn btn-danger" onClick={cancel}>
            {t('cancel')}
          </button>
          <button className="btn btn-success" onClick={save} disabled={!!saving}>
            {saving || t('save')}
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
        <ElapsedTimer since={draft.workout_date} />
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

/** Owns the 1 s tick so that only the timer re-renders, not the whole workout screen. */
function ElapsedTimer({ since }: { since: number }) {
  return <div className="timer">{formatElapsed(useNow() - since)}</div>;
}
