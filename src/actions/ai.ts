'use server';
// AI coach. The user's API key comes from the browser with every request and is never stored.
// The provider (Gemini / Claude / OpenAI) is picked in settings; adapters live in @/lib/ai.
// The model fetches its own data via tools (workout history, exercise list) and proposes templates
// with propose_template — the user saves them explicitly.
// NOTE: tool descriptions, system prompt and tool outputs are deliberately Russian — they steer the
// model towards the Russian exercise names stored in the database (see memory-bank/optimization-plan.md).
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { AiProviderError, getProvider, type AiTool, type AiToolCall } from '@/lib/ai';
import { requireUser } from '@/lib/auth';
import { getExercises, getTz } from '@/lib/data';
import { exerciseSearchText, matchesAllTerms, searchTerms } from '@/lib/search';
import { fmtNum, type ExerciseListItem } from '@/lib/types';
import { fail, ok, type ActionResult } from './_shared';

export type AiTemplate = {
  name: string;
  description: string | null;
  exercises: { id: number; name: string; isSuperset: boolean; sets: { weight: number | null; reps: number | null }[] }[];
};
export type AiMessage = { role: 'user' | 'model'; text: string; templates?: AiTemplate[]; model?: string };

const MAX_STEPS = 8; // guards against an endless tool-call loop
const providerIds = ['gemini', 'claude', 'openai'] as const;

const chatInput = z.object({
  provider: z.enum(providerIds).default('gemini'),
  apiKey: z.string().trim().min(10, 'aiKeyRequired').max(200),
  model: z.string().trim().regex(/^[\w.-]{1,60}$/, 'aiModelInvalid'),
  // Localized fallback template name: the model may omit `name`, and the server does not know the locale.
  defaultName: z.string().trim().min(1).max(100),
  messages: z
    .array(z.object({ role: z.enum(['user', 'model']), text: z.string().max(8000) }))
    .min(1)
    .max(40),
});
export type AiChatInput = z.input<typeof chatInput>;

const tools: AiTool[] = [
  {
    name: 'get_workouts',
    description: 'История тренировок пользователя за последние N дней: дата, название, упражнения и подходы (вес × повторы).',
    parameters: {
      type: 'object',
      properties: { days: { type: 'integer', description: 'За сколько дней, 1–365. По умолчанию 60.' } },
    },
  },
  {
    name: 'get_exercises',
    description:
      'Упражнения, доступные пользователю: id, название, группа мышц, тип, сколько раз выполнял. ' +
      'Без query — весь список. Только эти id можно использовать в шаблонах.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Слова для поиска, например «жим грудь»' } },
    },
  },
  {
    name: 'propose_template',
    description:
      'Предложить пользователю шаблон тренировки. Он увидит карточку с кнопкой «Сохранить в шаблоны». ' +
      'Вызывай для каждого предлагаемого шаблона.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string', description: 'Коротко: цель, отдых между подходами и т.п.' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              exercise_id: { type: 'integer', description: 'id из get_exercises' },
              superset_with_previous: { type: 'boolean' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    weight: { type: 'number', description: 'кг (для кардио — минуты)' },
                    reps: { type: 'integer', description: 'повторы (для кардио — метры)' },
                  },
                },
              },
            },
            required: ['exercise_id', 'sets'],
          },
        },
      },
      required: ['name', 'exercises'],
    },
  },
];

function systemPrompt(today: string) {
  return `Ты — персональный тренер в приложении GymCore. Сегодня ${today}. Отвечай по-русски, кратко и по делу, простым текстом без markdown-разметки.
Данные пользователя не угадывай — запрашивай функциями get_workouts и get_exercises.
Когда предлагаешь программу или тренировку, оформляй каждый шаблон вызовом propose_template,
используя только id из get_exercises. Вес в кг, подбирай его по истории тренировок; если истории нет — оставь вес пустым.
После предложения шаблона коротко объясни логику, не перечисляя все подходы повторно.`;
}

export async function aiChat(input: AiChatInput): Promise<ActionResult<{ text: string; templates: AiTemplate[]; model: string }>> {
  const user = await requireUser();
  const parsed = chatInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalidData');
  const { provider: providerId, apiKey, model, messages, defaultName } = parsed.data;

  const tz = await getTz();
  const day = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: tz }); // YYYY-MM-DD
  let exerciseList: ExerciseListItem[] | null = null;
  const loadExercises = async () => (exerciseList ??= await getExercises(user.id));
  const proposed: AiTemplate[] = [];

  async function runTool(call: AiToolCall): Promise<Record<string, unknown>> {
    const args = call.args ?? {};
    switch (call.name) {
      case 'get_workouts': {
        const days = Math.min(Math.max(Number(args.days) || 60, 1), 365);
        const list = await db.query.workouts.findMany({
          where: and(eq(workouts.userId, user.id), gte(workouts.workoutDate, new Date(Date.now() - days * 86_400_000))),
          orderBy: [desc(workouts.workoutDate)],
          limit: 100,
          with: {
            workoutExercises: {
              orderBy: (we, { asc }) => [asc(we.sortOrder)],
              with: { exercise: true, sets: { orderBy: (s, { asc }) => [asc(s.setOrder)] } },
            },
          },
        });
        if (!list.length) return { output: `Тренировок за ${days} дн. нет` };
        // Compact text instead of JSON — far fewer tokens
        const lines = list.map((w) => {
          const exs = w.workoutExercises
            .filter((we) => we.exercise)
            .map((we) => `${we.exercise!.name} [${we.sets.map((s) => `${fmtNum(s.weight) || '-'}×${s.reps ?? '-'}`).join(', ')}]`);
          return `${w.workoutDate ? day(w.workoutDate) : '?'} «${w.title}»: ${exs.join('; ')}`;
        });
        return { output: lines.join('\n') };
      }
      case 'get_exercises': {
        const terms = searchTerms(String(args.query ?? ''));
        const list = await loadExercises();
        const found = terms.length ? list.filter((ex) => matchesAllTerms(exerciseSearchText(ex), terms)) : list;
        if (!found.length) return { output: 'Ничего не найдено, попробуй другие слова или без query' };
        const lines = found.map(
          (ex) => `${ex.id};${ex.name};${ex.primary_groups.join('/') || ex.category || ''};${ex.exercise_type};${ex.usage_count}`,
        );
        return { output: 'id;название;мышцы;тип;раз выполнял\n' + lines.join('\n') };
      }
      case 'propose_template': {
        const byId = new Map((await loadExercises()).map((ex) => [ex.id, ex]));
        const raw = Array.isArray(args.exercises) ? (args.exercises as Record<string, unknown>[]) : [];
        const unknown = raw.map((e) => Number(e.exercise_id)).filter((id) => !byId.has(id));
        if (unknown.length) return { error: `Нет упражнений с id ${unknown.join(', ')}. Возьми id из get_exercises.` };
        if (!raw.length) return { error: 'Шаблон без упражнений' };
        const num = (v: unknown) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
        proposed.push({
          name: String(args.name ?? defaultName).slice(0, 100),
          description: args.description ? String(args.description).slice(0, 2000) : null,
          exercises: raw.slice(0, 50).map((e, i) => ({
            id: Number(e.exercise_id),
            name: byId.get(Number(e.exercise_id))!.name,
            isSuperset: i > 0 && !!e.superset_with_previous,
            sets: (Array.isArray(e.sets) && e.sets.length ? (e.sets as Record<string, unknown>[]) : [{}])
              .slice(0, 20)
              .map((s) => ({ weight: num(s.weight), reps: num(s.reps) })),
          })),
        });
        return { output: 'Шаблон показан пользователю' };
      }
      default:
        return { error: `Неизвестная функция ${call.name}` };
    }
  }

  const provider = getProvider(providerId);
  // If the selected model is overloaded (503), walk through the provider's fallback models in order.
  const chain = [model, ...provider.fallbackModels.filter((m) => m !== model)];
  for (const [i, modelName] of chain.entries()) {
    try {
      proposed.length = 0;
      const text = await provider.run({
        apiKey,
        model: modelName,
        systemPrompt: systemPrompt(day(new Date())),
        messages,
        tools,
        maxSteps: MAX_STEPS,
        runTool,
      });
      return ok({ text: text || (proposed.length ? '' : 'aiEmpty'), templates: proposed, model: modelName });
    } catch (e) {
      if (!(e instanceof AiProviderError)) {
        console.error('aiChat', e);
        return fail(`aiUnreachable|${provider.label}`);
      }
      // Overloaded or unreachable -> try the next model in the chain
      if (provider.isRetryable(e.status) && i < chain.length - 1) continue;
      // No HTTP status and no prepared message (e.g. DNS/timeout): log the raw error for debugging
      if (e.status === undefined && !e.userMessage) console.error('aiChat', e);
      return fail(e.userMessage ?? provider.describeError(e.status, e.raw));
    }
  }
  return fail(`aiUnreachable|${provider.label}`);
}
