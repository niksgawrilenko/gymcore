import { requireUser } from '@/lib/auth';
import { getTemplateList } from '@/lib/data';
import { TemplatesClient } from './TemplatesClient';

export default async function TemplatesPage() {
  const user = await requireUser();
  const templates = await getTemplateList(user.id);
  return <TemplatesClient templates={templates} userId={user.id} />;
}
