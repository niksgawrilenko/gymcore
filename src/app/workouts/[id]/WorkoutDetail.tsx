'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveTemplate } from '@/actions/templates';
import { deleteWorkout, saveWorkout } from '@/actions/workouts';
import { useTz } from '@/components/Chrome';
import { ExerciseListEditor } from '@/components/ExerciseListEditor';
import { MediaSection, uploadPending, type PendingMedia } from '@/components/MediaSection';
import { fmtDate, toLocalInputValue } from '@/lib/dates';
import { toEditorExercises, toSavePayload, type ExerciseListItem, type Media } from '@/lib/types';

type Workout = {
  id: number;
  title: string;
  workout_date: number;
  media: Media[];
  exercises: Parameters<typeof toEditorExercises>[0];
};

export function WorkoutDetail({ workout, exercises }: { workout: Workout; exercises: ExerciseListItem[] }) {
  const router = useRouter();
  const tz = useTz();
  const initial = () => ({
    title: workout.title,
    workout_date: workout.workout_date,
    exercises: toEditorExercises(workout.exercises),
    media: workout.media,
  });
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [saving, setSaving] = useState('');

  const update = (patch: Partial<typeof data>) => setData({ ...data, ...patch });

  async function save() {
    try {
      let media = data.media;
      if (pending.length) {
        setSaving('Загрузка фото...');
        media = [...media, ...(await uploadPending(pending))];
        setPending([]);
      }
      setSaving('Сохранение...');
      const res = await saveWorkout({ ...data, media, exercises: toSavePayload(data.exercises) }, workout.id);
      if (!res.ok) return alert(res.error);
      setData({ ...data, media });
      setEditing(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving('');
    }
  }

  async function remove() {
    if (!confirm('Удалить тренировку?')) return;
    await deleteWorkout(workout.id);
    router.push('/');
  }

  async function toTemplate() {
    const name = prompt('Название шаблона:', data.title);
    if (!name) return;
    const res = await saveTemplate({ name, exercises: toSavePayload(data.exercises) });
    alert(res.ok ? '✅ Шаблон создан со всеми связями и подходами!' : res.error);
  }

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/" className="back-link">
          ← Назад
        </Link>
        <div className="row">
          {editing ? (
            <>
              <button
                className="btn"
                onClick={() => {
                  setData(initial());
                  setPending([]);
                  setEditing(false);
                }}
              >
                Отмена
              </button>
              <button className="btn btn-success" onClick={save} disabled={!!saving}>
                {saving || '💾 Сохранить'}
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={toTemplate}>
                📑 В шаблон
              </button>
              <button className="btn" onClick={() => setEditing(true)}>
                ✎ Править
              </button>
              <button className="btn btn-danger" onClick={remove} aria-label="Удалить">
                🗑
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        {editing ? (
          <>
            <input className="set-input title-input" value={data.title} onChange={(e) => update({ title: e.target.value })} />
            <input
              type="datetime-local"
              className="set-input left"
              value={toLocalInputValue(data.workout_date)}
              onChange={(e) => e.target.value && update({ workout_date: new Date(e.target.value).getTime() })}
            />
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 5px' }}>{data.title}</h2>
            <div className="muted" style={{ fontSize: 14 }}>
              📅 {fmtDate(data.workout_date, tz, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>

      <ExerciseListEditor
        exercises={data.exercises}
        onChange={(list) => update({ exercises: list })}
        editing={editing}
        allExercises={exercises}
      />

      <MediaSection
        media={data.media}
        pending={pending}
        editing={editing}
        onMediaChange={(media) => update({ media })}
        onPendingChange={setPending}
      />
    </section>
  );
}
