import { requireUser } from '@/lib/auth';
import { getExercises } from '@/lib/data';
import { TemplateEditor } from '../TemplateEditor';

export default async function NewTemplatePage() {
  const user = await requireUser();
  return <TemplateEditor template={null} exercises={await getExercises(user.id)} />;
}
