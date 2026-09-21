import { requireUser } from '@/lib/auth';
import { getExercises, getPrevSets, getTemplate } from '@/lib/data';
import { ActiveWorkoutLoader } from './ActiveWorkoutLoader';

export default async function WorkoutPage({ searchParams }: PageProps<'/workout'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const templateId = Number(sp.template) || null;

  // Всё, что нужно экрану, — параллельно и за один заход на сервер
  const [exercises, prevSets, template] = await Promise.all([
    getExercises(user.id),
    getPrevSets(user.id),
    templateId ? getTemplate(user.id, templateId) : null,
  ]);

  return (
    <ActiveWorkoutLoader
      exercises={exercises}
      prevSets={prevSets}
      template={template}
      startNew={sp.new === '1'}
      date={Number(sp.date) || null}
    />
  );
}
