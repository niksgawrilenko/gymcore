'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
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
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const router = useRouter();
  const tw = useTranslations('workout');
  const active = useDraftMeta(tw('freeWorkout'));
  const [query, setQuery] = useState('');

  const filtered = templates.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()));
  const mine = filtered.filter((x) => x.userId === userId);
  const global = filtered.filter((x) => x.userId !== userId);

  function start(tpl?: Tpl) {
    const msg = tpl ? t('confirmDiscardWith') : t('confirmDiscardNew');
    if (!confirmDiscardDraft(msg)) return;
    router.push(tpl ? `/workout?new=1&template=${tpl.id}` : '/workout?new=1');
  }

  async function remove(id: number) {
    if (confirm(t('confirmDelete'))) await deleteTemplate(id);
  }

  async function moderate(id: number) {
    if (!confirm(t('confirmModerate'))) return;
    await submitTemplateForModeration(id);
    alert(t('moderated'));
  }

  async function share(shareId: string | null) {
    if (!shareId) return;
    await navigator.clipboard.writeText(`${location.origin}/shared/template/${shareId}`);
    alert(t('shareCopied'));
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
            {tpl.description || (personal ? t('noDescription') : t('systemTemplate'))}
          </div>
        </div>
        {personal ? (
          <div className="row" style={{ gap: 2 }}>
            <span className={`status-badge status-${tpl.moderationStatus || 'none'}`}>{tpl.moderationStatus || 'none'}</span>
            <Link href={`/templates/${tpl.id}`} className="ghost-btn accent-text" title={tc('edit')}>
              ✎
            </Link>
            <button className="ghost-btn" title={tc('moderate')} onClick={() => moderate(tpl.id)}>
              🌐
            </button>
            <button className="ghost-btn" title={tc('share')} onClick={() => share(tpl.shareId)}>
              🔗
            </button>
            <button className="ghost-btn danger-text" title={tc('delete')} onClick={() => remove(tpl.id)}>
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
              {t('activeWorkout')}
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
        {t('newWorkout')}
      </h2>
      <button className="outline-btn" style={{ marginTop: 0, marginBottom: 25 }} onClick={() => start()}>
        {t('freeWorkout')}
      </button>

      <div className="row-between mb">
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>{t('programs')}</h2>
        <Link href="/templates/new" className="plus-btn" aria-label={t('newTemplate')}>
          +
        </Link>
      </div>

      <input className="set-input left" style={{ marginBottom: 20 }} placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />

      {filtered.length === 0 && <div className="empty-state">{t('empty')}</div>}
      {mine.length > 0 && (
        <>
          <h3 className="accent-text mb" style={{ fontSize: 16 }}>
            {t('mine')}
          </h3>
          {renderList(mine, true)}
        </>
      )}
      {global.length > 0 && (
        <>
          <h3 className="muted mb" style={{ fontSize: 16, marginTop: 25 }}>
            {t('global')}
          </h3>
          {renderList(global, false)}
        </>
      )}
    </section>
  );
}
