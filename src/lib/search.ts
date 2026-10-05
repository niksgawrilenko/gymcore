// Multi-word exercise search ("back row") — shared by the picker (client) and the AI tool (server).
import type { ExerciseInfo } from './types';

/** " Back  Row " -> ['back', 'row'] */
export const searchTerms = (query: string) => query.toLowerCase().trim().split(/\s+/).filter(Boolean);

/** Searchable text: name, category and all muscle groups. */
export const exerciseSearchText = (ex: ExerciseInfo) =>
  [ex.name, ex.category, ...ex.primary_groups, ...ex.secondary_muscles].join(' ').toLowerCase();

/** Matches when EVERY query term is found. */
export const matchesAllTerms = (text: string, terms: string[]) => terms.every((t) => text.includes(t));

export function searchExercises<T extends ExerciseInfo & { usage_count?: number }>(list: T[], query: string, locale: string) {
  const terms = searchTerms(query);
  const filtered = terms.length ? list.filter((ex) => matchesAllTerms(exerciseSearchText(ex), terms)) : list;
  // First the ones performed most often, then alphabetically in the current locale
  return [...filtered].sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0) || a.name.localeCompare(b.name, locale));
}