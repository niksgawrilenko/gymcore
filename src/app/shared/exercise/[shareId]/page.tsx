import { notFound } from 'next/navigation';
import { importSharedExercise } from '@/actions/exercises';
import { getUser } from '@/lib/auth';
import { getSharedExercise } from '@/lib/data';
import { ImportButton } from '../../ImportButton';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function SharedExercisePage({ params }: PageProps<'/shared/exercise/[shareId]'>) {
  const { shareId } = await params;
  if (!UUID.test(shareId)) notFound();
  const [ex, user] = await Promise.all([getSharedExercise(shareId), getUser()]);
  if (!ex) notFound();

  return (
    <section className="page no-nav">
      <div className="card center" style={{ padding: '30px 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 15 }}>🏋️</div>
        <h2 style={{ marginBottom: 10 }}>{ex.name}</h2>
        <p className="muted" style={{ marginBottom: 25 }}>
          {ex.primary_groups.join(', ') || ex.category}
        </p>
        <ImportButton
          action={importSharedExercise.bind(null, shareId)}
          label="📥 Добавить в мои упражнения"
          loggedIn={!!user}
          next={`/shared/exercise/${shareId}`}
        />
      </div>
    </section>
  );
}
