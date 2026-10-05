'use client';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// The workout draft lives in localStorage only -> render the screen in the browser straight away, without SSR.
export const ActiveWorkoutLoader = dynamic(() => import('./ActiveWorkout').then((m) => m.ActiveWorkout), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  const t = useTranslations('common');
  return <div className="empty-state">{t('loading')}</div>;
}
