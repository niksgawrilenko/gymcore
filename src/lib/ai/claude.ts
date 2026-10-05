import 'server-only';
// Anthropic (Claude) adapter: Messages API with tool use.
import Anthropic from '@anthropic-ai/sdk';
import { PROVIDERS } from './config';
import { AI_LOOP_MESSAGE, AiProviderError, toProviderError, humanMessage, type AiProvider, type AiRunParams } from './types';

const cfg = PROVIDERS.claude;
const MAX_TOKENS = 4096;

const asArgs = (input: unknown): Record<string, unknown> =>
  input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

export const claude: AiProvider = {
  id: 'claude',
  label: cfg.label,
  fallbackModels: cfg.fallbackModels,

  async run({ apiKey, model, systemPrompt, messages, tools, maxSteps, runTool }: AiRunParams): Promise<string> {
    const client = new Anthropic({ apiKey, maxRetries: 2 });
    const toolDefs: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));
    const convo: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text || '…',
    }));

    try {
      for (let step = 0; step < maxSteps; step++) {
        const res = await client.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: convo,
          tools: toolDefs,
        });
        const calls = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        if (!calls.length) {
          return res.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();
        }

        // Push the full assistant turn (text + tool calls) back into the history
        const assistant: Anthropic.ContentBlockParam[] = res.content
          .filter((b) => b.type === 'text' || b.type === 'tool_use')
          .map((b) => (b.type === 'text' ? { type: 'text', text: b.text } : { type: 'tool_use', id: b.id, name: b.name, input: b.input }));
        convo.push({ role: 'assistant', content: assistant });

        const results = await Promise.all(calls.map((c) => runTool({ id: c.id, name: c.name, args: asArgs(c.input) })));
        convo.push({
          role: 'user',
          content: calls.map((c, i) => ({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(results[i]) })),
        });
      }
    } catch (e) {
      throw toProviderError(e);
    }
    throw new AiProviderError(undefined, 'loop', AI_LOOP_MESSAGE);
  },

  isRetryable(status) {
    return status === 500 || status === 502 || status === 503 || status === 529 || status === 404;
  },

  describeError(status, raw) {
    const msg = humanMessage(raw);
    if (/api key|authentication/i.test(msg) || status === 401 || status === 403) return `aiKey|${cfg.label}`;
    if (status === 500 || status === 502 || status === 503 || status === 529 || status === 404) return `aiOverloaded|${cfg.label}`;
    if (status === 429) return `aiRateLimited|${cfg.label}`;
    if (status === undefined) return `aiUnreachable|${cfg.label}`;
    return `aiFailed|${cfg.label}|${status}|${msg.slice(0, 200)}`;
  },
};
