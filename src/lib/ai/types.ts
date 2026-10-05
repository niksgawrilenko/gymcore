// Common interface for all AI providers (Gemini, Claude, OpenAI) plus a normalized error type.
// Adapters are server-only; config.ts is shared with the browser.

export type AiProviderId = 'gemini' | 'claude' | 'openai';

export type AiChatMessage = { role: 'user' | 'model'; text: string };

/** Neutral tool description: JSON Schema is understood by every provider. */
export type AiTool = { name: string; description: string; parameters: Record<string, unknown> };

export type AiToolCall = { id?: string; name: string; args: Record<string, unknown> };

/** The model looped on tool calls — shared across providers. Code from messages('errors'). */
export const AI_LOOP_MESSAGE = 'aiLoop';

/**
 * Provider error: `status` is the HTTP code (used for retry/fallback), `raw` is the original error
 * text and `userMessage` is a ready-made code (e.g. the loop message).
 */
export class AiProviderError extends Error {
  readonly status: number | undefined;
  readonly raw: string;
  readonly userMessage: string | undefined;

  constructor(status: number | undefined, raw: string, userMessage?: string) {
    super(raw);
    this.name = 'AiProviderError';
    this.status = status;
    this.raw = raw;
    this.userMessage = userMessage;
  }
}

export type AiRunParams = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AiChatMessage[];
  tools: AiTool[];
  maxSteps: number;
  /** Executes a tool call and returns the result to the model. */
  runTool: (call: AiToolCall) => Promise<Record<string, unknown>>;
};

export interface AiProvider {
  id: AiProviderId;
  label: string;
  /** Fallback models used when the primary one is overloaded (500/503/…). */
  fallbackModels: readonly string[];
  /** Runs one full dialogue turn on a single model and returns the final text. Throws AiProviderError. */
  run(params: AiRunParams): Promise<string>;
  /** Whether the request should be retried with the next model. */
  isRetryable(status: number | undefined): boolean;
  /** Returns an error CODE (see messages('errors') + useActionError) — the locale is only known in the UI. */
  describeError(status: number | undefined, raw: string): string;
}

/** Normalizes any SDK error into AiProviderError, extracting the HTTP status. */
export function toProviderError(e: unknown): AiProviderError {
  if (e instanceof AiProviderError) return e;
  const status = typeof (e as { status?: unknown } | null)?.status === 'number' ? (e as { status: number }).status : undefined;
  return new AiProviderError(status, e instanceof Error ? e.message : String(e));
}

/** Extracts a human-readable message from an error string (usually JSON like {"error":{"message":"…"}}). */
export function humanMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? raw;
  } catch {
    return raw;
  }
}
