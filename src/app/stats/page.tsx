import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getStats } from '@/lib/data';
import { StatsClient } from './StatsClient';

export default async function StatsPage() {
  const user = await requireUser();
  // Раньше: скачать 100 полных тренировок + всю базу упражнений и считать в браузере.
  // Теперь: 4 агрегирующих SQL-запроса параллельно, по ВСЕЙ истории.
  const stats = await getStats(user.id);

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← Назад
        </Link>
        <h2 style={{ fontSize: 16 }}>Моя аналитика</h2>
        <div style={{ width: 60 }} />
      </div>
      {stats.totalWorkouts === 0 ? (
        <div className="empty-state">
          У вас пока нет завершенных тренировок.
          <br />
          Сначала выполните хотя бы одну!
        </div>
      ) : (
        <StatsClient stats={stats} />
      )}
    </section>
  );
}
