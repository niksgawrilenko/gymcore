'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteTemplate, submitTemplateForModeration } from '@/actions/templates';
import { confirmDiscardDraft, useDraftMeta } from '@/lib/draft';

type Tpl = {
  id: number;
  name: string;
  description: string | null;
  userId: number | null;
  shareId: string | null;
  moderationStatus: string | null;
};

export function TemplatesClient({ templates, userId }: { templates: Tpl[]; userId: number }) {
  const router = useRouter();
  const active = useDraftMeta();
  const [query, setQuery] = useState('');

  const filtered = templates.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  const mine = filtered.filter((t) => t.userId === userId);
  const global = filtered.filter((t) => t.userId !== userId);

  function start(tpl?: Tpl) {
    const msg = tpl ? 'У вас есть активная тренировка. Сбросить её и начать по этому шаблону?' : 'У вас есть активная тренировка. Начать новую (текущая будет удалена)?';
    if (!confirmDiscardDraft(msg)) return;
    router.push(tpl ? `/workout?new=1&template=${tpl.id}` : '/workout?new=1');
  }

  async function remove(id: number) {
    if (confirm('Удалить этот шаблон?')) await deleteTemplate(id);
  }

  async function moderate(id: number) {
    if (!confirm('Отправить этот шаблон на модерацию, чтобы он стал общим для всех?')) return;
    await submitTemplateForModeration(id);
    alert('Шаблон отправлен на проверку!');
  }

  async function share(shareId: string | null) {
    if (!shareId) return;
    await navigator.clipboard.writeText(`${location.origin}/shared/template/${shareId}`);
    alert('Ссылка на шаблон скопирована!');
  }

  const renderList = (list: Tpl[], personal: boolean) =>
    list.map((tpl) => (
      <div key={tpl.id} className="card row-between" style={{ opacity: personal ? 1 : 0.85 }}>
        <div className="grow" style={{ cursor: 'pointer' }} onClick={() => start(tpl)}>
          <div className="row">
            <div className="bold" style={{ fontSize: 17 }}>
              {tpl.name}
            </div>
            {!personal && <span className="tag">🌍</span>}
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {tpl.description || (personal ? 'Без описания' : 'Системный шаблон')}
          </div>
        </div>
        {personal ? (
          <div className="row" style={{ gap: 2 }}>
            <span className={`status-badge status-${tpl.moderationStatus || 'none'}`}>{tpl.moderationStatus || 'none'}</span>
            <Link href={`/templates/${tpl.id}`} className="ghost-btn accent-text" title="Редактировать">
              ✎
            </Link>
            <button className="ghost-btn" title="На модерацию" onClick={() => moderate(tpl.id)}>
              🌐
            </button>
            <button className="ghost-btn" title="Поделиться" onClick={() => share(tpl.shareId)}>
              🔗
            </button>
            <button className="ghost-btn danger-text" title="Удалить" onClick={() => remove(tpl.id)}>
              🗑
            </button>
          </div>
        ) : (
          <div className="muted" style={{ padding: 10, fontSize: 14 }}>
            👁️
          </div>
        )}
      </div>
    ));

  return (
    <section className="page">
      {active && (
        <Link href="/workout" className="card active-card">
          <div>
            <h3 className="success-text" style={{ marginBottom: 5, fontSize: 16 }}>
              🟢 Активная тренировка
            </h3>
            <div className="bold" style={{ fontSize: 18 }}>
              {active.title}
            </div>
          </div>
          <div className="success-text" style={{ fontSize: 24, fontWeight: 'bold' }}>
            →
          </div>
        </Link>
      )}

      <h2 className="section-title" style={{ marginTop: 5 }}>
        Новая тренировка
      </h2>
      <button className="outline-btn" style={{ marginTop: 0, marginBottom: 25 }} onClick={() => start()}>
        + Свободная тренировка
      </button>

      <div className="row-between mb">
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Программы</h2>
        <Link href="/templates/new" className="plus-btn" aria-label="Новый шаблон">
          +
        </Link>
      </div>

      <input className="set-input left" style={{ marginBottom: 20 }} placeholder="🔍 Поиск шаблона..." value={query} onChange={(e) => setQuery(e.target.value)} />

      {filtered.length === 0 && <div className="empty-state">Шаблонов пока нет</div>}
      {mine.length > 0 && (
        <>
          <h3 className="accent-text mb" style={{ fontSize: 16 }}>
            👤 Мои программы
          </h3>
          {renderList(mine, true)}
        </>
      )}
      {global.length > 0 && (
        <>
          <h3 className="muted mb" style={{ fontSize: 16, marginTop: 25 }}>
            🌍 Глобальные шаблоны
          </h3>
          {renderList(global, false)}
        </>
      )}
    </section>
  );
}
