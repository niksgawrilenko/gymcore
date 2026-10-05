'use client';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { authenticate } from '@/actions/auth';

export function LoginForm({ next, initialMode = 'login' }: { next: string; initialMode?: 'login' | 'register' }) {
  const t = useTranslations('login');
  const tError = useTranslations('login.errors');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [state, action, pending] = useActionState(authenticate, undefined);
  const isLogin = mode === 'login';

  return (
    <form action={action} className="card" style={{ width: '100%', maxWidth: 400, padding: 25 }}>
      <h2 className="center mb">{isLogin ? t('headingLogin') : t('headingRegister')}</h2>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      <div className="field mb">
        <label htmlFor="username">{t('username')}</label>
        <input id="username" name="username" autoComplete="username" required placeholder={t('usernamePlaceholder')} />
      </div>
      <div className="field" style={{ marginBottom: 25 }}>
        <label htmlFor="password">{t('password')}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      {/* The action returns an error code, the text comes from the catalog — the form works in both languages. */}
      {state?.error && <div className="error-box">{tError(state.error)}</div>}

      <button type="submit" className="primary-btn mb" disabled={pending}>
        {pending ? t('pending') : isLogin ? t('submitLogin') : t('submitRegister')}
      </button>

      <div className="center small muted">
        {isLogin ? t('noAccount') : t('haveAccount')}{' '}
        <button type="button" className="ghost-btn accent-text bold" style={{ fontSize: 14 }} onClick={() => setMode(isLogin ? 'register' : 'login')}>
          {isLogin ? t('create') : t('signIn')}
        </button>
      </div>
    </form>
  );
}
