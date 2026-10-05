'use client';
import { useTranslations } from 'next-intl';
import { clearDraft } from '@/lib/draft';

export function ClearDraftButton() {
  const t = useTranslations('settings');
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(t('confirmClearDraft'))) return;
        clearDraft();
        alert(t('draftCleared'));
      }}
    >
      <span>{t('clearDraft')}</span>
      <span className="muted">→</span>
    </button>
  );
}
