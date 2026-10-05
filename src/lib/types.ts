// Shared types and pure helpers (used both on the server and in the browser).
import type { Media } from '@/db/schema';

export type { Media };

/** Selected but not yet uploaded media file (a File cannot be stored in localStorage). */
export type PendingMedia = { file: File; url: string; type: Media['type'] };

export type ExerciseInfo = {
  id: number;
  name: string;
  exercise_type: string;
  category: string | null;
  primary_groups: string[];
  secondary_muscles: string[];
  equipment: string | null;
};

export type ExerciseListItem = ExerciseInfo & {
  user_id: number | null;
  share_id: string | null;
  moderation_status: string | null;
  usage_count: number;
};

export type EditorSet = { weight: string; reps: string; completed: boolean };

export type EditorExercise = ExerciseInfo & {
  key: string; // stable key for React and drag-n-drop
  isSuperset: boolean; // true = chained to the previous exercise
  sets: EditorSet[];
};

export type WorkoutDraft = {
  title: string;
  template_id: number | null;
  workout_date: number; // ms
  exercises: EditorExercise[];
  media: Media[];
};

/** Previous sets keyed by exercise_id (as a string) — for hints and +/- badges. */
export type PrevSetsMap = Record<string, { weight: string | number | null; reps: number | null }[]>;

export const emptySet = (): EditorSet => ({ weight: '', reps: '', completed: false });

export const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);

/** "80.00" -> "80", "82.50" -> "82.5" */
export const fmtNum = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '' : String(Number(v));

type RawExercise = Partial<ExerciseInfo> & {
  id: number;
  name: string;
  superset_id?: string | null;
  isSuperset?: boolean;
  sets?: { weight?: string | number | null; reps?: string | number | null; completed?: boolean | null }[];
};

/** Normalizes exercises from the DB / a legacy draft into editor shape. superset_id -> isSuperset. */
export function toEditorExercises(list: RawExercise[]): EditorExercise[] {
  let prevSS: string | null | undefined = null;
  return list.map((ex) => {
    // DB rows carry superset_id (equal to the previous row = superset); drafts carry isSuperset.
    const hasSupersetId = 'superset_id' in ex;
    const isSuperset = hasSupersetId ? !!ex.superset_id && ex.superset_id === prevSS : !!ex.isSuperset;
    prevSS = ex.superset_id;
    const sets = ex.sets?.length
      ? ex.sets.map((s) => ({ weight: fmtNum(s.weight), reps: fmtNum(s.reps), completed: !!s.completed }))
      : [emptySet()];
    return {
      key: newKey(),
      id: ex.id,
      name: ex.name,
      exercise_type: ex.exercise_type ?? 'strength',
      category: ex.category ?? null,
      primary_groups: ex.primary_groups ?? [],
      secondary_muscles: ex.secondary_muscles ?? [],
      equipment: ex.equipment ?? null,
      isSuperset,
      sets,
    };
  });
}

/** Render groups: a superset is a run of consecutive exercises. */
export function groupExercises<T extends { isSuperset: boolean }>(list: T[]): { item: T; index: number }[][] {
  const groups: { item: T; index: number }[][] = [];
  list.forEach((item, index) => {
    if (item.isSuperset && index > 0) groups[groups.length - 1].push({ item, index });
    else groups.push([{ item, index }]);
  });
  return groups;
}

/** Payload shape accepted by the save actions. */
export function toSavePayload(list: EditorExercise[]) {
  return list.map((ex) => ({
    id: ex.id,
    isSuperset: ex.isSuperset,
    sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
  }));
}
