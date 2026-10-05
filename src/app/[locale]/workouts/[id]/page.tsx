import { notFound } from 'next/navigation';
import { currentLocale } from '@/i18n/server';
import { requireUser } from '@/lib/auth';
import { getExercises, getWorkout } from '@/lib/data';
import { WorkoutDetail } from './WorkoutDetail';

export default async function WorkoutDetailPage({ params }: PageProps<'/[locale]/workouts/[id]'>) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const locale = await currentLocale();
  const [workout, exercises] = await Promise.all([getWorkout(user.id, id, locale), getExercises(user.id, locale)]);
  if (!workout) notFound(); // someone else's or a non-existent workout

  return <WorkoutDetail workout={workout} exercises={exercises} />;
}
