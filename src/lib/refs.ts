// Reference strings (muscle groups, muscles, categories, equipment) are stored in the data language
// (Russian, see docs/i18n-plan.md §5) and translated only on display — like exercise names. This module
// is shared: the server loads the dictionaries (src/lib/data.ts), client components read them through
// RefsProvider (src/components/RefsProvider.tsx).
export type RefKind = 'primary_group' | 'secondary_muscle' | 'category' | 'equipment';

/** { kind: { sourceValue: label } } — plain object, serializable to client components. */
export type RefDict = Record<RefKind, Record<string, string>>;

export const EMPTY_REF_DICT: RefDict = { primary_group: {}, secondary_muscle: {}, category: {}, equipment: {} };

export const REF_KINDS: readonly RefKind[] = ['primary_group', 'secondary_muscle', 'category', 'equipment'];

/**
 * Lookup order: the same Russian value can sit in several dictionaries («Грудь» is both a group and a
 * muscle) and the UI shows values without knowing their kind — the first non-empty match wins.
 */
const PRIORITY: readonly RefKind[] = ['primary_group', 'category', 'secondary_muscle', 'equipment'];

/** Display label for a reference value: the translation, or the original Russian value as a fallback. */
export function refLabel(dict: RefDict, value: string | null | undefined): string {
  if (!value) return '';
  for (const kind of PRIORITY) {
    const hit = dict[kind][value];
    if (hit) return hit;
  }
  return value;
}
