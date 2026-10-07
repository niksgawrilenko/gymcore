import { getTranslations } from 'next-intl/server';
import { logout } from '@/actions/auth';
import { getUser } from '@/lib/auth';
import { isDemoUsername } from '@/lib/demo';

// Shown on every page while a throwaway `demo+…` account is signed in: explains the mode and exits it.
// Server component — the exit button posts the logout action, so no client JS is needed to leave.
export async function DemoBanner() {
  const user = await getUser();
  if (!user || !isDemoUsername(user.username)) return null;
  const t = await getTranslations('demo');

  return (
    <div className="demo-banner" role="status">
      <span>{t('bannerText')}</span>
      <form action={logout}>
        <button type="submit" className="ghost-btn accent-text bold">
          {t('exit')}
        </button>
      </form>
    </div>
  );
}
