'use client';
import { useTransition } from 'react';

export function ImportButton({ action, label, loggedIn, next }: { action: () => Promise<unknown>; label: string; loggedIn: boolean; next: string }) {
  const [pending, start] = useTransition();
  if (!loggedIn) {
    return (
      <a href={`/login?next=${encodeURIComponent(next)}`} className="primary-btn" style={{ textDecoration: 'none' }}>
        Войдите, чтобы добавить к себе
      </a>
    );
  }
  return (
    <button
      className="primary-btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = (await action()) as { ok: false; error: string } | undefined;
          if (res && !res.ok) alert(res.error);
        })
      }
    >
      {pending ? 'Сохранение...' : label}
    </button>
  );
}
