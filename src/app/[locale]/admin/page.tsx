import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
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
  const t = await getTranslations('admin');
  const tc = await getTranslations('common');

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
              <div className="muted xsmall">{t('fromUser', { id: item.userId ?? '?' })}</div>
            </div>
            <div className="row">
              <form action={moderate.bind(null, type, item.id, true)}>
                <button className="btn btn-success">{t('approve')}</button>
              </form>
              <form action={moderate.bind(null, type, item.id, false)}>
                <button className="btn btn-solid-danger">{t('reject')}</button>
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
          ← {tc('back')}
        </Link>
        <h2 style={{ fontSize: 16 }}>{t('title')}</h2>
        <div style={{ width: 60 }} />
      </div>
      {ex.length + tpl.length === 0 && <div className="empty-state">{t('empty')}</div>}
      {section(t('exercises'), 'exercise', ex)}
      {section(t('templates'), 'template', tpl)}
    </section>
  );
}
