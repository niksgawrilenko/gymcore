import { requireUser } from '@/lib/auth';
import { getWorkoutList } from '@/lib/data';
import { HistoryClient } from './HistoryClient';

export default async function HistoryPage() {
  const user = await requireUser();
  // Только id/название/дата — без подходов. Старый API тянул полные тренировки ради списка.
  const workouts = await getWorkoutList(user.id);
  return <HistoryClient workouts={workouts} />;
}
