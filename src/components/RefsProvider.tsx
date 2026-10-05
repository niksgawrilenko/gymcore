'use client';
// Reference-string translations (muscle groups/muscles/categories/equipment) for client components.
// The dictionary is loaded server-side once per request and passed down as a plain object.
import { createContext, useCallback, useContext } from 'react';
import { EMPTY_REF_DICT, refLabel, type RefDict, type RefLabel } from '@/lib/refs';

const RefsContext = createContext<RefDict>(EMPTY_REF_DICT);

export function RefsProvider({ dict, children }: { dict: RefDict; children: React.ReactNode }) {
  return <RefsContext.Provider value={dict}>{children}</RefsContext.Provider>;
}

/** Returns a translator for reference strings, e.g. label('Спина и шея') -> 'Back & neck'. */
export function useRefLabel(): RefLabel {
  const dict = useContext(RefsContext);
  // Stable per dictionary, so it can safely sit in a dependency list (search re-runs only when needed).
  return useCallback((value: string | null | undefined) => refLabel(dict, value), [dict]);
}
