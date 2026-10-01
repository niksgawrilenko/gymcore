'use server';
// ИИ-тренер на Gemini. Ключ пользователя приходит из браузера с каждым запросом и нигде не сохраняется.
// Модель сама запрашивает данные через функции (история тренировок, список упражнений)
// и предлагает шаблоны через propose_template — записывает их пользователь кнопкой.
import { ApiError, GoogleGenAI, type Content, type FunctionCall, type FunctionDeclaration } from '@google/genai';
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getExercises, getTz } from '@/lib/data';
import { fmtNum, type ExerciseListItem } from '@/lib/types';
import { fail, ok, type ActionResult } from './_shared';

export type AiTemplate = {
  name: string;
  description: string | null;
  exercises: { id: number; name: string; isSuperset: boolean; sets: { weight: number | null; reps: number | null }[] }[];
};
export type AiMessage = { role: 'user' | 'model'; text: string; templates?: AiTemplate[]; model?: string };

const MAX_STEPS = 8; // защита от бесконечного цикла вызовов функций
// Если выбранная модель перегружена (503) — по очереди пробуем эти
const FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest'];

const chatInput = z.object({
  apiKey: z.string().trim().min(10, 'Укажите API-ключ Gemini').max(200),
  model: z.string().trim().regex(/^[\w.-]{1,60}$/, 'Некорректное название модели'),
  messages: z
    .array(z.object({ role: z.enum(['user', 'model']), text: z.string().max(8000) }))
    .min(1)
    .max(40),
});
export type AiChatInput = z.input<typeof chatInput>;

const tools: FunctionDeclaration[] = [
  {
    name: 'get_workouts',
    description: 'История тренировок пользователя за последние N дней: дата, название, упражнения и подходы (вес × повторы).',
    parametersJsonSchema: {
      type: 'object',
      properties: { days: { type: 'integer', description: 'За сколько дней, 1–365. По умолчанию 60.' } },
    },
  },
  {
    name: 'get_exercises',
    description:
      'Упражнения, доступные пользователю: id, название, группа мышц, тип, сколько раз выполнял. ' +
      'Без query — весь список. Только эти id можно использовать в шаблонах.',
    parametersJsonSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Слова для поиска, например «жим грудь»' } },
    },
  },
  {
    name: 'propose_template',
    description:
      'Предложить пользователю шаблон тренировки. Он увидит карточку с кнопкой «Сохранить в шаблоны». ' +
      'Вызывай для каждого предлагаемого шаблона.',
    parametersJsonSchema: {
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
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Некорректные данные');
  const { apiKey, model, messages } = parsed.data;

  const tz = await getTz();
  const day = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: tz }); // YYYY-MM-DD
  let exerciseList: ExerciseListItem[] | null = null;
  const loadExercises = async () => (exerciseList ??= await getExercises(user.id));
  const proposed: AiTemplate[] = [];

  async function runTool(call: FunctionCall): Promise<Record<string, unknown>> {
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
        // Компактный текст вместо JSON — в разы меньше токенов
        const lines = list.map((w) => {
          const exs = w.workoutExercises
            .filter((we) => we.exercise)
            .map((we) => `${we.exercise!.name} [${we.sets.map((s) => `${fmtNum(s.weight) || '-'}×${s.reps ?? '-'}`).join(', ')}]`);
          return `${w.workoutDate ? day(w.workoutDate) : '?'} «${w.title}»: ${exs.join('; ')}`;
        });
        return { output: lines.join('\n') };
      }
      case 'get_exercises': {
        const terms = String(args.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        const found = (await loadExercises()).filter((ex) => {
          const text = [ex.name, ex.category, ...ex.primary_groups, ...ex.secondary_muscles].join(' ').toLowerCase();
          return terms.every((t) => text.includes(t));
        });
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
          name: String(args.name ?? 'Шаблон от ИИ').slice(0, 100),
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

  // 500/503 («модель перегружена») у Gemini частые и короткие -> один повтор через 2 с, дальше — запасная модель.
  // 429 не повторяем: на бесплатном тарифе это минутный лимит, повторы его только съедят.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { retryOptions: { attempts: 2, initialDelay: 2, maxDelay: 2, httpStatusCodes: [500, 503] } },
  });

  // Один ход диалога целиком на одной модели: подписи мыслей Gemini не переносятся между моделями
  async function runTurn(modelName: string) {
    proposed.length = 0;
    // История из браузера — только текст; предложенные ранее шаблоны модель видит кратким списком
    const contents: Content[] = messages.map((m) => ({ role: m.role, parts: [{ text: m.text || '…' }] }));
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await ai.models.generateContent({
        model: modelName,
        contents,
        config: { systemInstruction: systemPrompt(day(new Date())), tools: [{ functionDeclarations: tools }] },
      });
      const calls = res.functionCalls;
      if (!calls?.length) return ok({ text: res.text?.trim() || (proposed.length ? '' : 'Пустой ответ модели'), templates: proposed, model: modelName });

      // Ответ модели кладём целиком (в нём служебные подписи мыслей, без них Gemini ругается)
      contents.push(res.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((c) => ({ functionCall: c })) });
      const results = await Promise.all(calls.map(runTool));
      contents.push({
        role: 'user',
        parts: calls.map((c, i) => ({ functionResponse: { id: c.id, name: c.name, response: results[i] } })),
      });
    }
    return fail('Модель зациклилась на вызовах функций, попробуйте переформулировать');
  }

  const chain = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  for (const [i, modelName] of chain.entries()) {
    try {
      return await runTurn(modelName);
    } catch (e) {
      if (!(e instanceof ApiError)) {
        console.error('aiChat', e);
        return fail('Не удалось связаться с Gemini');
      }
      // Перегружена или недоступна -> пробуем следующую модель
      if ([500, 503, 404].includes(e.status) && i < chain.length - 1) continue;
      // message обычно JSON вида {"error":{"message":"..."}}
      let msg = e.message;
      try {
        msg = JSON.parse(msg).error?.message ?? msg;
      } catch {}
      if (/api key/i.test(msg) || e.status === 401 || e.status === 403) return fail('Gemini не принял API-ключ, проверьте его в настройках ⚙️');
      if (e.status === 503 || e.status === 500 || e.status === 404) return fail('Все модели Gemini сейчас перегружены у Google. Повторите через пару минут.');
      if (e.status === 429) return fail('Превышен лимит запросов Gemini (бесплатный тариф). Подождите минуту.');
      return fail(`Ошибка Gemini (${e.status}): ${msg.slice(0, 200)}`);
    }
  }
  return fail('Не удалось связаться с Gemini');
}
