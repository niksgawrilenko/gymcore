'use client';
// Reference-string translations (muscle groups/muscles/categories/equipment) for client components.
// The dictionary is loaded server-side once per request and passed down as a plain object.
import { createContext, useContext } from 'react';
import { EMPTY_REF_DICT, refLabel, type RefDict } from '@/lib/refs';

const RefsContext = createContext<RefDict>(EMPTY_REF_DICT);

export function RefsProvider({ dict, children }: { dict: RefDict; children: React.ReactNode }) {
  return <RefsContext.Provider value={dict}>{children}</RefsContext.Provider>;
}

/** Returns a translator for reference strings, e.g. label('Спина и шея') -> 'Back & neck'. */
export function useRefLabel() {
  const dict = useContext(RefsContext);
  return (value: string | null | undefined) => refLabel(dict, value);
}
