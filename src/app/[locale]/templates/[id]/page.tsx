import { notFound } from 'next/navigation';
import { currentLocale } from '@/i18n/server';
import { requireUser } from '@/lib/auth';
import { getExercises, getTemplate } from '@/lib/data';
import { TemplateEditor } from '../TemplateEditor';

export default async function EditTemplatePage({ params }: PageProps<'/[locale]/templates/[id]'>) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const locale = await currentLocale();
  const [template, exercises] = await Promise.all([getTemplate(user.id, id, locale), getExercises(user.id, locale)]);
  if (!template || template.userId !== user.id) notFound(); // only your own templates can be edited

  return <TemplateEditor template={template} exercises={exercises} />;
}
