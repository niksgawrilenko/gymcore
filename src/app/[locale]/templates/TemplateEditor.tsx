'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { deleteTemplate, saveTemplate } from '@/actions/templates';
import { ExerciseListEditor } from '@/components/ExerciseListEditor';
import { useActionError } from '@/i18n/errors';
import { toEditorExercises, toSavePayload, type ExerciseListItem } from '@/lib/types';

type Template = { id: number; name: string; exercises: Parameters<typeof toEditorExercises>[0] };

export function TemplateEditor({ template, exercises }: { template: Template | null; exercises: ExerciseListItem[] }) {
  const t = useTranslations('templateEditor');
  const tc = useTranslations('common');
  const err = useActionError();
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? t('newName'));
  const [list, setList] = useState(() => toEditorExercises(template?.exercises ?? []));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await saveTemplate({ name, exercises: toSavePayload(list) }, template?.id);
    setSaving(false);
    if (!res.ok) return alert(err(res.error));
    router.push('/templates');
  }

  async function remove() {
    if (!template || !confirm(t('confirmDelete'))) return;
    await deleteTemplate(template.id);
    router.push('/templates');
  }

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/templates" className="back-link">
          ← {tc('back')}
        </Link>
        <div className="row">
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? tc('saving') : `💾 ${tc('save')}`}
          </button>
          {template && (
            <button className="btn btn-danger" onClick={remove} aria-label={tc('delete')}>
              🗑
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <input className="set-input title-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} />
        <div className="muted" style={{ fontSize: 14 }}>
          {t('subtitle')}
        </div>
      </div>

      <ExerciseListEditor
        exercises={list}
        onChange={setList}
        editing
        showChecks={false}
        allExercises={exercises}
        emptyText={t('emptyText')}
      />
    </section>
  );
}
