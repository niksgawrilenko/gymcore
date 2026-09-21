import { LoginForm } from './LoginForm';

export const metadata = { title: 'Вход — GymCore' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <h1 style={{ marginBottom: 30, fontSize: 36, fontWeight: 800 }}>
        Gym<span className="accent-text">Core</span>
      </h1>
      <LoginForm next={typeof next === 'string' ? next : ''} />
    </div>
  );
}
