'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { aiChat, type AiMessage, type AiTemplate } from '@/actions/ai';
import { saveTemplate } from '@/actions/templates';

const SETTINGS_KEY = 'gymcore_ai_settings';
const HISTORY_KEY = 'gymcore_ai_chat';
const DEFAULT_MODEL = 'gemini-flash-latest';
const HISTORY_SENT = 30; // сколько последних сообщений отправлять модели

type Settings = { apiKey: string; model: string };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Модель не видит прошлых вызовов функций -> напоминаем, какие шаблоны она уже предлагала
const forModel = (m: AiMessage) =>
  m.templates?.length
    ? `${m.text}\n${m.templates.map((t) => `[Предложен шаблон «${t.name}»: ${t.exercises.map((e) => e.name).join(', ')}]`).join('\n')}`
    : m.text;

export function AiChat() {
  const [settings, setSettings] = useState<Settings>(() => load(SETTINGS_KEY, { apiKey: '', model: DEFAULT_MODEL }));
  const [editing, setEditing] = useState(() => !settings.apiKey);
  const [messages, setMessages] = useState<AiMessage[]>(() => load(HISTORY_KEY, []));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const updateMessages = (list: AiMessage[]) => {
    setMessages(list);
    store(HISTORY_KEY, list);
  };

  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    const list: AiMessage[] = [...messages, { role: 'user', text: q }];
    updateMessages(list);
    setText('');
    setError('');
    setBusy(true);
    try {
      // Первое сообщение для Gemini должно быть от пользователя
      const recent = list.slice(-HISTORY_SENT);
      const fromUser = recent.slice(recent.findIndex((m) => m.role === 'user'));
      const res = await aiChat({
        apiKey: settings.apiKey,
        model: settings.model,
        messages: fromUser.map((m) => ({ role: m.role, text: forModel(m) })),
      });
      if (!res.ok) throw new Error(res.error);
      const { model, ...answer } = res.data;
      updateMessages([...list, { role: 'model', ...answer, ...(model !== settings.model && { model }) }]);
    } catch (e) {
      // Неотправленное сообщение возвращаем в поле ввода, чтобы повтор не дублировал его в истории
      updateMessages(messages);
      setText(q);
      setError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setBusy(false);
    }
  }

  function saveSettings(next: Settings) {
    setSettings(next);
    store(SETTINGS_KEY, next);
    setEditing(false);
  }

  return (
    <section className="page">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← Профиль
        </Link>
        <div className="row">
          {messages.length > 0 && (
            <button className="btn" onClick={() => confirm('Начать новый чат? Переписка удалится.') && updateMessages([])}>
              🗒 Новый чат
            </button>
          )}
          <button className="btn" onClick={() => setEditing(!editing)} aria-label="Настройки ИИ">
            ⚙️
          </button>
        </div>
      </div>

      {editing ? (
        <SettingsForm initial={settings} onSave={saveSettings} onCancel={settings.apiKey ? () => setEditing(false) : undefined} />
      ) : (
        <>
          {messages.length === 0 && (
            <div className="empty-state">
              🤖 Спросите ИИ-тренера: проанализировать прогресс, подобрать программу на неделю, заменить упражнение...
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              {m.text && <div className="chat-bubble">{m.text}</div>}
              {m.templates?.map((t, j) => <TemplateCard key={j} template={t} />)}
              {m.model && <div className="muted xsmall chat-note">Основная модель недоступна, ответила {m.model}</div>}
            </div>
          ))}
          {busy && (
            <div className="chat-msg model">
              <div className="chat-bubble muted">Думаю...</div>
            </div>
          )}
          {error && <div className="error-box">{error}</div>}
          <div ref={bottom} />

          <div className="chat-input card">
            <textarea
              className="form-input"
              rows={2}
              placeholder="Сообщение..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn btn-accent" onClick={send} disabled={busy || !text.trim()}>
              ➤
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function SettingsForm({ initial, onSave, onCancel }: { initial: Settings; onSave: (s: Settings) => void; onCancel?: () => void }) {
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Настройки ИИ</h3>
      <div className="field mb">
        <label>API-ключ Gemini</label>
        <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza..." />
      </div>
      <div className="field mb">
        <label>Модель</label>
        <input list="gemini-models" value={model} onChange={(e) => setModel(e.target.value)} />
        <datalist id="gemini-models">
          <option value="gemini-flash-latest" />
          <option value="gemini-3.7-flash" />
          <option value="gemini-3.6-flash" />
          <option value="gemini-flash-lite-latest" />
          <option value="gemini-pro-latest" />
        </datalist>
      </div>
      <p className="muted small mb">
        Бесплатный ключ:{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="accent-text">
          aistudio.google.com/apikey
        </a>
        . Ключ хранится только в этом браузере.
      </p>
      <div className="row">
        <button className="btn btn-accent" disabled={!apiKey.trim() || !model.trim()} onClick={() => onSave({ apiKey: apiKey.trim(), model: model.trim() })}>
          Сохранить
        </button>
        {onCancel && (
          <button className="btn" onClick={onCancel}>
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: AiTemplate }) {
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await saveTemplate({
        name: template.name,
        description: template.description,
        exercises: template.exercises.map((e) => ({ id: e.id, isSuperset: e.isSuperset, sets: e.sets })),
      });
      if (!res.ok) return alert(res.error);
      setSaved(res.data.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card chat-template">
      <div className="bold mb">📋 {template.name}</div>
      {template.description && <p className="muted small mb">{template.description}</p>}
      {template.exercises.map((e, i) => (
        <div key={i} className={`small chat-template-row${e.isSuperset ? ' ss' : ''}`}>
          <span>
            {i + 1}. {e.name}
          </span>
          <span className="muted">
            {e.sets.map((s) => (s.weight != null ? `${s.weight}×${s.reps ?? '-'}` : (s.reps ?? '-'))).join(', ')}
          </span>
        </div>
      ))}
      {saved ? (
        <Link href={`/templates/${saved}`} className="btn btn-success mt">
          ✓ Сохранено — открыть
        </Link>
      ) : (
        <button className="btn btn-accent mt" onClick={save} disabled={saving}>
          {saving ? 'Сохранение...' : '💾 Сохранить в шаблоны'}
        </button>
      )}
    </div>
  );
}
