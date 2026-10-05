import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { measurements, workouts } from '@/db/schema';
import { getUser } from '@/lib/auth';

// Full backup: every workout with exercises and sets plus all measurements.
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const [allWorkouts, allMeasurements] = await Promise.all([
    db.query.workouts.findMany({
      where: eq(workouts.userId, user.id),
      orderBy: desc(workouts.workoutDate),
      columns: { userId: false },
      with: {
        workoutExercises: {
          orderBy: (we, { asc }) => [asc(we.sortOrder)],
          columns: { workoutId: false },
          with: {
            exercise: { columns: { id: true, name: true, category: true, exerciseType: true } },
            sets: { orderBy: (s, { asc }) => [asc(s.setOrder)], columns: { workoutExerciseId: false } },
          },
        },
      },
    }),
    db.select().from(measurements).where(eq(measurements.userId, user.id)).orderBy(desc(measurements.date)),
  ]);

  const body = JSON.stringify({ exportDate: new Date().toISOString(), username: user.username, workouts: allWorkouts, measurements: allMeasurements }, null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="GymCore_Backup_${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
