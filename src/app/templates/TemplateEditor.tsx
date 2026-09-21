'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteTemplate, saveTemplate } from '@/actions/templates';
import { ExerciseListEditor } from '@/components/ExerciseListEditor';
import { toEditorExercises, toSavePayload, type ExerciseListItem } from '@/lib/types';

type Template = { id: number; name: string; exercises: Parameters<typeof toEditorExercises>[0] };

export function TemplateEditor({ template, exercises }: { template: Template | null; exercises: ExerciseListItem[] }) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? 'Новый шаблон');
  const [list, setList] = useState(() => toEditorExercises(template?.exercises ?? []));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await saveTemplate({ name, exercises: toSavePayload(list) }, template?.id);
    setSaving(false);
    if (!res.ok) return alert(res.error);
    router.push('/templates');
  }

  async function remove() {
    if (!template || !confirm('Удалить этот шаблон навсегда?')) return;
    await deleteTemplate(template.id);
    router.push('/templates');
  }

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/templates" className="back-link">
          ← Назад
        </Link>
        <div className="row">
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
          {template && (
            <button className="btn btn-danger" onClick={remove} aria-label="Удалить">
              🗑
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <input className="set-input title-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название шаблона" />
        <div className="muted" style={{ fontSize: 14 }}>
          📝 Конструктор многоразовых программ
        </div>
      </div>

      <ExerciseListEditor
        exercises={list}
        onChange={setList}
        editing
        showChecks={false}
        allExercises={exercises}
        emptyText="Добавьте упражнения для шаблона"
      />
    </section>
  );
}
