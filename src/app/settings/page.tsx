import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { ClearDraftButton } from './ClearDraftButton';

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← В профиль
        </Link>
        <h2 style={{ fontSize: 16 }}>Настройки</h2>
        <div style={{ width: 60 }} />
      </div>

      <h3 className="caps" style={{ margin: '0 0 10px 5px', fontSize: 14 }}>
        Аккаунт
      </h3>
      <div className="card" style={{ padding: 15, marginBottom: 25 }}>
        <div className="row-between info-row" style={{ paddingBottom: 15, marginBottom: 15 }}>
          <span>Имя пользователя</span>
          <span className="muted">{user.username}</span>
        </div>
        <div className="row-between">
          <span>Роль</span>
          <span className="btn-accent" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 'bold' }}>
            {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
          </span>
        </div>
      </div>

      <h3 className="caps" style={{ margin: '0 0 10px 5px', fontSize: 14 }}>
        Данные
      </h3>
      <div className="card menu-list">
        {/* Полная выгрузка всех тренировок (старая выгружала только последние 10) */}
        <a href="/api/export" download>
          <span>📥 Скачать резервную копию (JSON)</span>
          <span className="muted">→</span>
        </a>
        <ClearDraftButton />
      </div>
    </section>
  );
}
