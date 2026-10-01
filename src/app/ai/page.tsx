import { requireUser } from '@/lib/auth';
import { AiChatLoader } from './AiChatLoader';

export default async function AiPage() {
  await requireUser();
  return <AiChatLoader />;
}
