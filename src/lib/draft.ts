'use client';
// The active workout draft lives in localStorage (same key as the legacy version, so an unfinished
// workout survives the migration). The server knows nothing about it until the user saves; the title
// fallback for drafts without a title comes from the UI (localized), not from this module.
import { useSyncExternalStore } from 'react';
import { toEditorExercises, type PendingMedia, type WorkoutDraft } from './types';

const KEY = 'gymcore_active_workout';
const EVENT = 'gymcore:draft';

/** Selected but not yet uploaded files (a File cannot be stored in localStorage). */
export const pendingMedia: PendingMedia[] = [];

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Storage can be blocked (private mode) — behave as if there were no draft.
    return null;
  }
}

/** `fallbackTitle` is the localized label used when the draft has no title. */
export function loadDraft(fallbackTitle: string): WorkoutDraft | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      title: d.title || fallbackTitle,
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
  } catch {
    // Quota exceeded or storage blocked — the in-memory state still works.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage blocked — nothing to clean up.
  }
  pendingMedia.length = 0;
  window.dispatchEvent(new Event(EVENT));
}

export const hasDraft = () => !!readRaw();

/** Asks for confirmation when an unfinished workout exists. true = a new one may start. */
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

/** Title and start time of the active workout (mini player and the templates-screen card). */
export function useDraftMeta(fallbackTitle: string): { title: string; start: number } | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    return d ? { title: d.title || fallbackTitle, start: Number(d.workout_date) || 0 } : null;
  } catch {
    return null;
  }
}
