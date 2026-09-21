'use client';
import dynamic from 'next/dynamic';

// Черновик тренировки живёт только в localStorage -> рендерим экран сразу в браузере, без SSR.
export const ActiveWorkoutLoader = dynamic(() => import('./ActiveWorkout').then((m) => m.ActiveWorkout), {
  ssr: false,
  loading: () => <div className="empty-state">Загрузка...</div>,
});
