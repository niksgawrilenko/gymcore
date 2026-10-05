import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

// Gives the browser a name, theme and icons so the app installs correctly on the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — workout journal`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f2f2f7',
    theme_color: '#007aff',
    icons: [
      { src: '/icon.png', sizes: 'any', type: 'image/png' },
      { src: '/apple-icon.png', sizes: 'any', type: 'image/png' },
    ],
  };
}
