import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation: the app uses these wrappers instead of `next/link` and `next/navigation` —
// they add the locale prefix (/ru/...) themselves and keep the current locale across navigations.
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing);
