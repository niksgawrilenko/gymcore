import type { ReactNode } from 'react';
import './marketing.css';

// Public pages (landing page, privacy policy).
// The header with the logo and theme switcher comes from the root layout; the app's bottom
// navigation is not shown here.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="mkt">{children}</div>;
}
