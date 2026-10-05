// Theme. The cookie (not localStorage) is the source of truth: the server renders <html data-theme>,
// so the value survives a locale switch (the root layout is re-created). localStorage is read once in
// TzProvider (src/components/Chrome.tsx) to migrate the choice made by older versions.
export const THEME_COOKIE = 'theme';
export const THEME_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Cookie value -> the `data-theme` attribute of <html>.
 * Returns `undefined` when the user has never picked a theme: the system theme is then applied by the
 * CSS media query in globals.css (`:root:not([data-theme])`). An explicit choice (including "light")
 * must be rendered by the server, otherwise the media query would override it on a dark system theme.
 */
export function parseTheme(value: string | undefined): 'dark' | 'light' | undefined {
  return value === 'dark' || value === 'light' ? value : undefined;
}
