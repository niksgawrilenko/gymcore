import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// The plugin wires src/i18n/request.ts into server components (getTranslations, NextIntlClientProvider).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
