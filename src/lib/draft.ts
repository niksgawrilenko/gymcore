'use client';
// Черновик активной тренировки живёт в localStorage (тот же ключ, что в старой версии —
// незаконченная тренировка переживёт переезд). Сервер о черновике ничего не знает до «Сохранить».
import { useSyncExternalStore } from 'react';
import { toEditorExercises, type Media, type WorkoutDraft } from './types';

const KEY = 'gymcore_active_workout';
const EVENT = 'gymcore:draft';

/** Выбранные, но ещё не загруженные файлы (File нельзя положить в localStorage). */
export const pendingMedia: { file: File; url: string; type: Media['type'] }[] = [];

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function loadDraft(): WorkoutDraft | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      title: d.title || 'Свободная тренировка',
      template_id: d.template_id ? Number(d.template_id) : null,
      workout_date: Number(d.workout_date) || Date.now(),
      exercises: toEditorExercises(Array.isArray(d.exercises) ? d.exercises : []),
      media: Array.isArray(d.media) ? d.media : [],
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: WorkoutDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  pendingMedia.length = 0;
  window.dispatchEvent(new Event(EVENT));
}

export const hasDraft = () => !!readRaw();

/** Спрашивает подтверждение, если есть незаконченная тренировка. true = можно начинать новую. */
export function confirmDiscardDraft(message: string) {
  if (!hasDraft()) return true;
  if (!confirm(message)) return false;
  clearDraft();
  return true;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Заголовок и старт активной тренировки (для мини-плеера и карточки на экране шаблонов). */
export function useDraftMeta(): { title: string; start: number } | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    return d ? { title: d.title || 'Тренировка', start: Number(d.workout_date) || 0 } : null;
  } catch {
    return null;
  }
}
