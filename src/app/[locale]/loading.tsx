import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('common');
  return <div className="empty-state">{t('loading')}</div>;
}
