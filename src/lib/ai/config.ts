// Single configuration for the AI providers: ids, labels, models and API-key hints.
// Imported both by the server (adapters) and by the browser (the AI settings form).
import type { AiProviderId } from './types';

export type ProviderConfig = {
  id: AiProviderId;
  label: string;
  keyPlaceholder: string;
  keyUrl: string;
  keyUrlLabel: string;
  defaultModel: string;
  /** Model suggestions for the datalist. */
  models: string[];
  /** Models used as fallbacks when the primary one is overloaded. */
  fallbackModels: string[];
};

export const PROVIDERS: Record<AiProviderId, ProviderConfig> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'aistudio.google.com/apikey',
    defaultModel: 'gemini-flash-latest',
    models: ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-pro-latest'],
    fallbackModels: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest'],
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    keyPlaceholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'console.anthropic.com/settings/keys',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5', 'claude-sonnet-4-5'],
    fallbackModels: ['claude-sonnet-5', 'claude-haiku-4-5'],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'platform.openai.com/api-keys',
    defaultModel: 'gpt-5.1',
    models: ['gpt-5.1', 'gpt-5.1-mini', 'gpt-5', 'gpt-4.1', 'o4-mini'],
    fallbackModels: ['gpt-5.1-mini', 'gpt-4.1'],
  },
};

export const PROVIDER_LIST: ProviderConfig[] = [PROVIDERS.gemini, PROVIDERS.claude, PROVIDERS.openai];

export const DEFAULT_PROVIDER: AiProviderId = 'gemini';
