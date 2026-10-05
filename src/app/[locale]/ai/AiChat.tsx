'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useRef, useState } from 'react';
import { aiChat, type AiMessage, type AiTemplate } from '@/actions/ai';
import { saveTemplate } from '@/actions/templates';
import { useActionError } from '@/i18n/errors';
import { DEFAULT_PROVIDER, PROVIDERS, PROVIDER_LIST } from '@/lib/ai/config';
import type { AiProviderId } from '@/lib/ai/types';

const SETTINGS_KEY = 'gymcore_ai_settings';
const HISTORY_KEY = 'gymcore_ai_chat';
const HISTORY_SENT = 30; // how many recent messages are sent to the model

type Settings = { provider: AiProviderId; apiKey: string; model: string };

// Older settings stored { apiKey, model } only — fill in the default provider.
const DEFAULT_SETTINGS: Settings = { provider: DEFAULT_PROVIDER, apiKey: '', model: PROVIDERS[DEFAULT_PROVIDER].defaultModel };

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

// The model does not see past tool calls -> remind it which templates it already proposed
const forModel = (m: AiMessage) =>
  m.templates?.length
    ? `${m.text}\n${m.templates.map((t) => `[Предложен шаблон «${t.name}»: ${t.exercises.map((e) => e.name).join(', ')}]`).join('\n')}`
    : m.text;

export function AiChat() {
  const t = useTranslations('ai');
  const err = useActionError();
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(SETTINGS_KEY, {}) }));
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
      // The first message of a conversation must come from the user
      const recent = list.slice(-HISTORY_SENT);
      const fromUser = recent.slice(recent.findIndex((m) => m.role === 'user'));
      const res = await aiChat({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        defaultName: t('defaultTemplateName'),
        messages: fromUser.map((m) => ({ role: m.role, text: forModel(m) })),
      });
      if (!res.ok) throw new Error(res.error);
      const { model, ...answer } = res.data;
      updateMessages([...list, { role: 'model', ...answer, ...(model !== settings.model && { model }) }]);
    } catch (e) {
      // Put the unsent message back into the input so a retry does not duplicate it in the history
      updateMessages(messages);
      setText(q);
      setError(e instanceof Error ? err(e.message) : err('requestFailed'));
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
          ← {t('backToProfile')}
        </Link>
        <div className="row">
          {messages.length > 0 && (
            <button className="btn" onClick={() => confirm(t('confirmNewChat')) && updateMessages([])}>
              {t('newChat')}
            </button>
          )}
          <button className="btn" onClick={() => setEditing(!editing)} aria-label={t('settingsTitle')}>
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
              {t('empty')}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              {m.text && <div className="chat-bubble">{m.text === 'aiEmpty' ? t('emptyResponse') : m.text}</div>}
              {m.templates?.map((tpl, j) => <TemplateCard key={j} template={tpl} />)}
              {m.model && <div className="muted xsmall chat-note">{t('modelFallback', { model: m.model })}</div>}
            </div>
          ))}
          {busy && (
            <div className="chat-msg model">
              <div className="chat-bubble muted">{t('thinking')}</div>
            </div>
          )}
          {error && <div className="error-box">{error}</div>}
          <div ref={bottom} />

          <div className="chat-input card">
            <textarea
              className="form-input"
              rows={2}
              placeholder={t('messagePlaceholder')}
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
  const t = useTranslations('ai');
  const tc = useTranslations('common');
  // Key labels depend on the provider -> keys like `${provider}.keyLabel` in messages('ai.providers').
  const tp = useTranslations('ai.providers') as unknown as (key: string) => string;
  const [provider, setProvider] = useState<AiProviderId>(initial.provider);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const cfg = PROVIDERS[provider];

  // The key and the model belong to a provider — on switch we fall back to that provider's defaults
  function chooseProvider(id: AiProviderId) {
    setProvider(id);
    setApiKey('');
    setModel(PROVIDERS[id].defaultModel);
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>{t('settingsTitle')}</h3>
      <div className="field mb">
        <label>{t('assistant')}</label>
        <select value={provider} onChange={(e) => chooseProvider(e.target.value as AiProviderId)}>
          {PROVIDER_LIST.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field mb">
        <label>{tp(`${provider}.keyLabel`)}</label>
        <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={cfg.keyPlaceholder} />
      </div>
      <div className="field mb">
        <label>{t('model')}</label>
        <input list="ai-models" value={model} onChange={(e) => setModel(e.target.value)} />
        <datalist id="ai-models">
          {cfg.models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <p className="muted small mb">
        {tp(`${provider}.keyHint`)}{' '}
        <a href={cfg.keyUrl} target="_blank" rel="noreferrer" className="accent-text">
          {cfg.keyUrlLabel}
        </a>
        . {t('keyStored')}
      </p>
      <div className="row">
        <button
          className="btn btn-accent"
          disabled={!apiKey.trim() || !model.trim()}
          onClick={() => onSave({ provider, apiKey: apiKey.trim(), model: model.trim() })}
        >
          {t('save')}
        </button>
        {onCancel && (
          <button className="btn" onClick={onCancel}>
            {tc('cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: AiTemplate }) {
  const t = useTranslations('ai');
  const tc = useTranslations('common');
  const err = useActionError();
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
      if (!res.ok) return alert(err(res.error));
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
          {t('savedOpen')}
        </Link>
      ) : (
        <button className="btn btn-accent mt" onClick={save} disabled={saving}>
          {saving ? tc('saving') : t('saveToTemplates')}
        </button>
      )}
    </div>
  );
}
