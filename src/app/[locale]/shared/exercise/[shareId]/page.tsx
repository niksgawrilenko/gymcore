import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { importSharedExercise } from '@/actions/exercises';
import { currentLocale } from '@/i18n/server';
import { getUser } from '@/lib/auth';
import { getSharedExercise, loadRefDict } from '@/lib/data';
import { refLabel } from '@/lib/refs';
import { ImportButton } from '../../ImportButton';

// A personal link: anyone holding it can open the page, but it must never end up in search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function SharedExercisePage({ params }: PageProps<'/[locale]/shared/exercise/[shareId]'>) {
  const { shareId } = await params;
  if (!UUID.test(shareId)) notFound();
  const locale = await currentLocale();
  const [ex, user] = await Promise.all([getSharedExercise(shareId, locale), getUser()]);
  if (!ex) notFound();
  const [t, refDict] = await Promise.all([getTranslations('shared'), loadRefDict(locale)]);

  return (
    <section className="page no-nav">
      <div className="card center" style={{ padding: '30px 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 15 }}>🏋️</div>
        <h2 style={{ marginBottom: 10 }}>{ex.name}</h2>
        <p className="muted" style={{ marginBottom: 25 }}>
          {ex.primary_groups.map((m) => refLabel(refDict, m)).join(', ') || refLabel(refDict, ex.category)}
        </p>
        <ImportButton
          action={importSharedExercise.bind(null, shareId)}
          label={t('exercise.add')}
          loggedIn={!!user}
          next={`/shared/exercise/${shareId}`}
        />
      </div>
    </section>
  );
}
