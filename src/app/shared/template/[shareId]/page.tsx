import { notFound } from 'next/navigation';
import { importSharedTemplate } from '@/actions/templates';
import { getUser } from '@/lib/auth';
import { getSharedTemplate } from '@/lib/data';
import { ImportButton } from '../../ImportButton';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function SharedTemplatePage({ params }: PageProps<'/shared/template/[shareId]'>) {
  const { shareId } = await params;
  if (!UUID.test(shareId)) notFound();
  const [tpl, user] = await Promise.all([getSharedTemplate(shareId), getUser()]);
  if (!tpl) notFound();

  return (
    <section className="page no-nav">
      <div className="card center" style={{ padding: '30px 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 15 }}>📋</div>
        <h2 style={{ marginBottom: 10 }}>{tpl.name}</h2>
        <p className="muted" style={{ marginBottom: 25 }}>
          {tpl.description || 'Программа тренировок'}
        </p>
        <div style={{ textAlign: 'left', background: 'var(--bg-color)', padding: 15, borderRadius: 12, marginBottom: 25 }}>
          <div className="accent-text bold small" style={{ marginBottom: 10 }}>
            СОСТАВ ПРОГРАММЫ:
          </div>
          {tpl.exercises.map((ex, i) => (
            <div key={i} style={{ fontSize: 14, marginBottom: 5 }}>
              {i + 1}. {ex.name} <span className="muted">· {ex.sets.length} подх.</span>
            </div>
          ))}
        </div>
        <ImportButton
          action={importSharedTemplate.bind(null, shareId)}
          label="📥 Добавить в мои программы"
          loggedIn={!!user}
          next={`/shared/template/${shareId}`}
        />
      </div>
    </section>
  );
}
