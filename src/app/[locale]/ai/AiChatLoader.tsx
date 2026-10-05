'use client';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Key and chat history live in localStorage only -> render in the browser straight away, without SSR.
export const AiChatLoader = dynamic(() => import('./AiChat').then((m) => m.AiChat), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  const t = useTranslations('common');
  return <div className="empty-state">{t('loading')}</div>;
}
