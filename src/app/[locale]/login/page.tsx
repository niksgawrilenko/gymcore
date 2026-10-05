import { getTranslations } from 'next-intl/server';
import { LoginForm } from './LoginForm';

export async function generateMetadata() {
  const t = await getTranslations('login');
  return { title: t('title') };
}

export default async function LoginPage({ searchParams }: PageProps<'/[locale]/login'>) {
  const { next, mode } = await searchParams;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <h1 style={{ marginBottom: 30, fontSize: 36, fontWeight: 800 }}>
        Gym<span className="accent-text">Core</span>
      </h1>
      {/* ?mode=register opens the form in sign-up mode straight away (linked from the landing page). */}
      <LoginForm next={typeof next === 'string' ? next : ''} initialMode={mode === 'register' ? 'register' : 'login'} />
    </div>
  );
}
