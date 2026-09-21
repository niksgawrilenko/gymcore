'use client';
import { useActionState, useState } from 'react';
import { authenticate } from '@/actions/auth';

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [state, action, pending] = useActionState(authenticate, undefined);
  const isLogin = mode === 'login';

  return (
    <form action={action} className="card" style={{ width: '100%', maxWidth: 400, padding: 25 }}>
      <h2 className="center mb">{isLogin ? 'Вход в аккаунт' : 'Новый аккаунт'}</h2>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      <div className="field mb">
        <label htmlFor="username">Логин</label>
        <input id="username" name="username" autoComplete="username" required placeholder="Введите логин" />
      </div>
      <div className="field" style={{ marginBottom: 25 }}>
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder="Введите пароль"
        />
      </div>

      {state?.error && <div className="error-box">{state.error}</div>}

      <button type="submit" className="primary-btn mb" disabled={pending}>
        {pending ? 'Ожидание...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
      </button>

      <div className="center small muted">
        {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
        <button type="button" className="ghost-btn accent-text bold" style={{ fontSize: 14 }} onClick={() => setMode(isLogin ? 'register' : 'login')}>
          {isLogin ? 'Создать' : 'Войти'}
        </button>
      </div>
    </form>
  );
}
