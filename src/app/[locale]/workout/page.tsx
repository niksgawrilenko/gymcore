import { currentLocale } from '@/i18n/server';
import { requireUser } from '@/lib/auth';
import { getExercises, getPrevSets, getTemplate } from '@/lib/data';
import { ActiveWorkoutLoader } from './ActiveWorkoutLoader';

export default async function WorkoutPage({ searchParams }: PageProps<'/[locale]/workout'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const templateId = Number(sp.template) || null;
  const locale = await currentLocale();

  // Everything the screen needs — in parallel, in a single server round-trip
  const [exercises, prevSets, template] = await Promise.all([
    getExercises(user.id, locale),
    getPrevSets(user.id),
    templateId ? getTemplate(user.id, templateId, locale) : null,
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
