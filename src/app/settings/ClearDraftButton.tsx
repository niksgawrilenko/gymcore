'use client';
import { clearDraft } from '@/lib/draft';

export function ClearDraftButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm('Удалить черновик активной тренировки?')) return;
        clearDraft();
        alert('Черновик удалён');
      }}
    >
      <span>🧹 Сбросить активную тренировку</span>
      <span className="muted">→</span>
    </button>
  );
}
