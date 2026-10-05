import { requireUser } from '@/lib/auth';
import { getWorkoutList } from '@/lib/data';
import { HistoryClient } from './HistoryClient';

export default async function HistoryPage() {
  const user = await requireUser();
  // Only id/title/date — no sets. The old API pulled full workouts just to render the list.
  const workouts = await getWorkoutList(user.id);
  return <HistoryClient workouts={workouts} />;
}
