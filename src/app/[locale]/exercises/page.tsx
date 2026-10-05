import { currentLocale } from '@/i18n/server';
import { requireUser } from '@/lib/auth';
import { getExercises } from '@/lib/data';
import { ExercisesClient } from './ExercisesClient';

export default async function ExercisesPage() {
  const user = await requireUser();
  return <ExercisesClient exercises={await getExercises(user.id, await currentLocale())} userId={user.id} />;
}
