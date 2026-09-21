import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { moderate } from '@/actions/misc';
import { db } from '@/db';
import { exercises, templates } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

export default async function AdminPage() {
  await requireAdmin();
  const [ex, tpl] = await Promise.all([
    db.select({ id: exercises.id, name: exercises.name, userId: exercises.userId }).from(exercises).where(eq(exercises.moderationStatus, 'pending')),
    db.select({ id: templates.id, name: templates.name, userId: templates.userId }).from(templates).where(eq(templates.moderationStatus, 'pending')),
  ]);

  const section = (title: string, type: 'exercise' | 'template', items: typeof ex) =>
    items.length > 0 && (
      <>
        <h3 className="mb mt">
          {title} ({items.length})
        </h3>
        {items.map((item) => (
          <div key={item.id} className="card row-between">
            <div>
              <strong>{item.name}</strong>
              <div className="muted xsmall">от пользователя #{item.userId}</div>
            </div>
            <div className="row">
              <form action={moderate.bind(null, type, item.id, true)}>
                <button className="btn btn-success">Одобрить</button>
              </form>
              <form action={moderate.bind(null, type, item.id, false)}>
                <button className="btn btn-solid-danger">Отклонить</button>
              </form>
            </div>
          </div>
        ))}
      </>
    );

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← Назад
        </Link>
        <h2 style={{ fontSize: 16 }}>🛡️ Модерация</h2>
        <div style={{ width: 60 }} />
      </div>
      {ex.length + tpl.length === 0 && <div className="empty-state">Новых заявок пока нет. Отдыхай, кэп! ☕</div>}
      {section('Упражнения', 'exercise', ex)}
      {section('Шаблоны', 'template', tpl)}
    </section>
  );
}
