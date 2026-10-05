import 'server-only';
// OpenAI (GPT) adapter: Chat Completions API with function tools.
import OpenAI from 'openai';
import { PROVIDERS } from './config';
import { AI_LOOP_MESSAGE, AiProviderError, toProviderError, humanMessage, type AiProvider, type AiRunParams } from './types';

const cfg = PROVIDERS.openai;
const MAX_TOKENS = 4096;

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type FunctionToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;

const parseArgs = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export const openai: AiProvider = {
  id: 'openai',
  label: cfg.label,
  fallbackModels: cfg.fallbackModels,

  async run({ apiKey, model, systemPrompt, messages, tools, maxSteps, runTool }: AiRunParams): Promise<string> {
    const client = new OpenAI({ apiKey, maxRetries: 2 });
    const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    const convo: MessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(
        (m): MessageParam => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text || '…' }),
      ),
    ];

    try {
      for (let step = 0; step < maxSteps; step++) {
        const res = await client.chat.completions.create({
          model,
          messages: convo,
          tools: toolDefs,
          max_completion_tokens: MAX_TOKENS,
        });
        const msg = res.choices[0]?.message;
        const calls = (msg?.tool_calls ?? []).filter((c): c is FunctionToolCall => c.type === 'function');
        if (!calls.length) return msg?.content?.trim() ?? '';

        convo.push({ role: 'assistant', content: msg?.content ?? null, tool_calls: calls });
        const results = await Promise.all(
          calls.map((c) => runTool({ id: c.id, name: c.function.name, args: parseArgs(c.function.arguments) })),
        );
        for (const [i, c] of calls.entries()) {
          convo.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(results[i]) });
        }
      }
    } catch (e) {
      throw toProviderError(e);
    }
    throw new AiProviderError(undefined, 'loop', AI_LOOP_MESSAGE);
  },

  isRetryable(status) {
    return status === 500 || status === 502 || status === 503 || status === 404;
  },

  describeError(status, raw) {
    const msg = humanMessage(raw);
    if (/api key|incorrect api key|unauthorized/i.test(msg) || status === 401 || status === 403) return `aiKey|${cfg.label}`;
    if (status === 500 || status === 502 || status === 503 || status === 404) return `aiOverloaded|${cfg.label}`;
    if (status === 429) return `aiRateLimited|${cfg.label}`;
    if (status === undefined) return `aiUnreachable|${cfg.label}`;
    return `aiFailed|${cfg.label}|${status}|${msg.slice(0, 200)}`;
  },
};
