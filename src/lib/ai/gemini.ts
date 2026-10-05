import 'server-only';
// Gemini adapter.
import { GoogleGenAI, type Content, type FunctionDeclaration } from '@google/genai';
import { PROVIDERS } from './config';
import { AI_LOOP_MESSAGE, AiProviderError, toProviderError, humanMessage, type AiProvider, type AiRunParams, type AiTool } from './types';

const cfg = PROVIDERS.gemini;

const toDeclaration = (t: AiTool): FunctionDeclaration => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.parameters,
});

export const gemini: AiProvider = {
  id: 'gemini',
  label: cfg.label,
  fallbackModels: cfg.fallbackModels,

  async run({ apiKey, model, systemPrompt, messages, tools, maxSteps, runTool }: AiRunParams): Promise<string> {
    // Gemini overload (500/503) is frequent but short -> a single retry after 2 s.
    // 429 is not retried: on the free tier it is a per-minute quota, retries only drain it.
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { retryOptions: { attempts: 2, initialDelay: 2, maxDelay: 2, httpStatusCodes: [500, 503] } },
    });

    // Browser history carries text only; Gemini thought signatures are not portable across models
    const contents: Content[] = messages.map((m) => ({ role: m.role, parts: [{ text: m.text || '…' }] }));
    try {
      for (let step = 0; step < maxSteps; step++) {
        const res = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: systemPrompt, tools: [{ functionDeclarations: tools.map(toDeclaration) }] },
        });
        const calls = res.functionCalls;
        if (!calls?.length) return res.text?.trim() ?? '';

        // Push the whole model turn back (it carries thought signatures Gemini requires)
        contents.push(res.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((c) => ({ functionCall: c })) });
        const results = await Promise.all(calls.map((c) => runTool({ id: c.id, name: c.name ?? '', args: c.args ?? {} })));
        contents.push({
          role: 'user',
          parts: calls.map((c, i) => ({ functionResponse: { id: c.id, name: c.name, response: results[i] } })),
        });
      }
    } catch (e) {
      throw toProviderError(e);
    }
    throw new AiProviderError(undefined, 'loop', AI_LOOP_MESSAGE);
  },

  isRetryable(status) {
    return status === 500 || status === 503 || status === 404;
  },

  describeError(status, raw) {
    const msg = humanMessage(raw);
    if (/api key/i.test(msg) || status === 401 || status === 403) return `aiKey|${cfg.label}`;
    if (status === 503 || status === 500 || status === 404) return `aiOverloaded|${cfg.label}`;
    if (status === 429) return `aiRateLimited|${cfg.label}`;
    if (status === undefined) return `aiUnreachable|${cfg.label}`;
    return `aiFailed|${cfg.label}|${status}|${msg.slice(0, 200)}`;
  },
};
