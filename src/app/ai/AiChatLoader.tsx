'use client';
import dynamic from 'next/dynamic';

// Ключ и переписка живут только в localStorage -> рендерим сразу в браузере, без SSR.
export const AiChatLoader = dynamic(() => import('./AiChat').then((m) => m.AiChat), {
  ssr: false,
  loading: () => <div className="empty-state">Загрузка...</div>,
});
