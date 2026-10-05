// Multi-word exercise search ("back row") — shared by the picker (client) and the AI tool (server).
import type { RefLabel } from './refs';
import type { ExerciseInfo } from './types';

/** No translation (the data language): labels are searched as they are stored. */
const rawLabel: RefLabel = (value) => value ?? '';

/** " Back  Row " -> ['back', 'row'] */
export const searchTerms = (query: string) => query.toLowerCase().trim().split(/\s+/).filter(Boolean);

/**
 * Searchable text: name, category, equipment and all muscle groups. Reference values are passed through
 * `label`, so an EN search matches the translated group/category/equipment labels too (and RU ones).
 */
export const exerciseSearchText = (ex: ExerciseInfo, label: RefLabel = rawLabel) =>
  [
    ex.name,
    label(ex.category),
    label(ex.equipment),
    ...ex.primary_groups.map((group) => label(group)),
    ...ex.secondary_muscles.map((muscle) => label(muscle)),
  ]
    .join(' ')
    .toLowerCase();

/** Matches when EVERY query term is found. */
export const matchesAllTerms = (text: string, terms: string[]) => terms.every((t) => text.includes(t));

export function searchExercises<T extends ExerciseInfo & { usage_count?: number }>(
  list: T[],
  query: string,
  locale: string,
  label: RefLabel = rawLabel,
) {
  const terms = searchTerms(query);
  const filtered = terms.length ? list.filter((ex) => matchesAllTerms(exerciseSearchText(ex, label), terms)) : list;
  // First the ones performed most often, then alphabetically in the current locale
  return [...filtered].sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0) || a.name.localeCompare(b.name, locale));
}