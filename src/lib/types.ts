// Общие типы и чистые функции (используются и на сервере, и в браузере).
import type { Media } from '@/db/schema';

export type { Media };

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
  key: string; // стабильный ключ для React и drag-n-drop
  isSuperset: boolean; // true = связан с предыдущим упражнением
  sets: EditorSet[];
};

export type WorkoutDraft = {
  title: string;
  template_id: number | null;
  workout_date: number; // ms
  exercises: EditorExercise[];
  media: Media[];
};

/** Прошлые подходы по имени упражнения (lowercase) — для подсказок и бейджей +/-. */
export type PrevSetsMap = Record<string, { weight: string | number | null; reps: number | null }[]>;

export const emptySet = (): EditorSet => ({ weight: '', reps: '', completed: false });

export const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);

export const nameKey = (name: string) => name.trim().toLowerCase();

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

/** Приводит упражнения из БД / старого черновика к виду редактора. superset_id -> isSuperset. */
export function toEditorExercises(list: RawExercise[]): EditorExercise[] {
  let prevSS: string | null | undefined = null;
  return list.map((ex) => {
    const isSuperset = 'superset_id' in ex ? !!ex.superset_id && ex.superset_id === prevSS : !!ex.isSuperset;
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

/** Группы для отрисовки: суперсет = несколько подряд идущих упражнений. */
export function groupExercises<T extends { isSuperset: boolean }>(list: T[]): { item: T; index: number }[][] {
  const groups: { item: T; index: number }[][] = [];
  list.forEach((item, index) => {
    if (item.isSuperset && index > 0) groups[groups.length - 1].push({ item, index });
    else groups.push([{ item, index }]);
  });
  return groups;
}

/** Формат, который принимают экшены сохранения. */
export function toSavePayload(list: EditorExercise[]) {
  return list.map((ex) => ({
    id: ex.id,
    isSuperset: ex.isSuperset,
    sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
  }));
}
