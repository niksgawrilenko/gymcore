import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getExercises, getWorkout } from '@/lib/data';
import { WorkoutDetail } from './WorkoutDetail';

export default async function WorkoutDetailPage({ params }: PageProps<'/workouts/[id]'>) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [workout, exercises] = await Promise.all([getWorkout(user.id, id), getExercises(user.id)]);
  if (!workout) notFound(); // чужая или несуществующая тренировка

  return <WorkoutDetail workout={workout} exercises={exercises} />;
}
