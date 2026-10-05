'use client';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useActionError } from '@/i18n/errors';

export function ImportButton({ action, label, loggedIn, next }: { action: () => Promise<unknown>; label: string; loggedIn: boolean; next: string }) {
  const t = useTranslations('shared');
  const tc = useTranslations('common');
  const err = useActionError();
  const [pending, start] = useTransition();
  if (!loggedIn) {
    return (
      <a href={`/login?next=${encodeURIComponent(next)}`} className="primary-btn" style={{ textDecoration: 'none' }}>
        {t('loginToAdd')}
      </a>
    );
  }
  return (
    <button
      className="primary-btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = (await action()) as { ok: false; error: string } | undefined;
          if (res && !res.ok) alert(err(res.error));
        })
      }
    >
      {pending ? tc('saving') : label}
    </button>
  );
}
