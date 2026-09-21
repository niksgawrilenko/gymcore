import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getExercises, getTemplate } from '@/lib/data';
import { TemplateEditor } from '../TemplateEditor';

export default async function EditTemplatePage({ params }: PageProps<'/templates/[id]'>) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [template, exercises] = await Promise.all([getTemplate(user.id, id), getExercises(user.id)]);
  if (!template || template.userId !== user.id) notFound(); // редактировать можно только свои

  return <TemplateEditor template={template} exercises={exercises} />;
}
