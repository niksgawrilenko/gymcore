// Одноразовый демо-режим (вариант B): кнопка «Демо» создаёт свежего пользователя `demo+<random>`
// и клонирует в него каноничные данные пользователя `demo` (см. db/demo/seed.mjs). Клон живёт в
// отдельной строке users, поэтому настоящий аккаунт остаётся нетронутым, а гость получает полноценные
// данные (шаблоны, история, замеры). Уборка — ленивая (при следующем запуске) + Vercel Cron.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { SessionUser } from './session';

// Тот же фиктивный хеш, что в src/actions/auth.ts: паролем в демо-аккаунт войти нельзя, единственный
// вход — кнопка «Демо».
const DUMMY_HASH = '$2b$10$VPBpDmh.ujQihm60FsuAROCJArKB864otv3GUnNtSeGl3QMtguu1i';

export const DEMO_SOURCE_USERNAME = 'demo';
export const DEMO_USERNAME_PREFIX = 'demo+';
/** Время жизни одноразового демо-аккаунта; после него он удаляется при следующем запуске/кроне. */
export const DEMO_TTL_HOURS = 24;

/** true для одноразовых клонов (`demo+…`), false для каноничного `demo` — только по нему показываем баннер. */
export const isDemoUsername = (username: string) => username.startsWith(DEMO_USERNAME_PREFIX);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** `demo+` + 16 hex-символов (~64 бита) — коллизия имён практически исключена. */
const randomDemoUsername = () => `${DEMO_USERNAME_PREFIX}${randomBytes(8).toString('hex')}`;

/** id каноничного демо-пользователя — источника данных для клонирования. */
async function getSourceUserId(): Promise<number> {
  const { rows } = await db.execute<{ id: number }>(
    sql`SELECT id FROM users WHERE username = ${DEMO_SOURCE_USERNAME} LIMIT 1`,
  );
  if (!rows.length) throw new Error('demo: canonical user is not seeded (npm run db:demo:seed)');
  return rows[0].id;
}

/**
 * Удаляет одноразовые демо-аккаунты старше DEMO_TTL_HOURS (каскады уносят их данные).
 * Вызывается лениво при старте демо и по Vercel Cron. Ошибка здесь не должна ломать запуск демо.
 */
export async function purgeExpiredDemos(): Promise<number> {
  try {
    const { rows } = await db.execute<{ id: number }>(
      sql`DELETE FROM users
          WHERE username LIKE ${`${DEMO_USERNAME_PREFIX}%`}
            AND created_at < now() - make_interval(hours => ${DEMO_TTL_HOURS})
          RETURNING id`,
    );
    return rows.length;
  } catch {
    return 0;
  }
}

/** Копирует шаблоны, тренировки и замеры пользователя `sourceId` в `targetId` (в одной транзакции). */
async function cloneUserData(tx: Tx, targetId: number, sourceId: number) {
  // Шаблоны программ: id родителей переносим в map, чтобы привязать тренировки к копиям.
  const templates = await tx.execute<{ id: number; name: string; description: string | null }>(
    sql`SELECT id, name, description FROM templates WHERE user_id = ${sourceId}`,
  );
  const templateMap = new Map<number, number>();
  for (const tpl of templates.rows) {
    const { rows } = await tx.execute<{ id: number }>(
      sql`INSERT INTO templates (name, description, user_id, is_public)
          VALUES (${tpl.name}, ${tpl.description}, ${targetId}, false) RETURNING id`,
    );
    const newTemplateId = rows[0].id;
    templateMap.set(Number(tpl.id), newTemplateId);

    const exercises = await tx.execute<{ id: number }>(
      sql`SELECT id FROM template_exercises WHERE template_id = ${tpl.id} ORDER BY sort_order`,
    );
    for (const te of exercises.rows) {
      const inserted = await tx.execute<{ id: number }>(
        sql`INSERT INTO template_exercises (template_id, exercise_id, sort_order, superset_id)
            SELECT ${newTemplateId}, exercise_id, sort_order, superset_id
            FROM template_exercises WHERE id = ${te.id} RETURNING id`,
      );
      await tx.execute(
        sql`INSERT INTO template_sets (template_exercise_id, set_order, weight, reps)
            SELECT ${inserted.rows[0].id}, set_order, weight, reps
            FROM template_sets WHERE template_exercise_id = ${te.id} ORDER BY set_order`,
      );
    }
  }

  // Тренировки и подходы: тот же приём — сначала копия «шапки», затем дочерние строки через SELECT по id.
  const workouts = await tx.execute<{ id: number; template_id: number | null }>(
    sql`SELECT id, template_id FROM workouts WHERE user_id = ${sourceId}`,
  );
  for (const workout of workouts.rows) {
    const newTemplateId = workout.template_id == null ? null : templateMap.get(Number(workout.template_id)) ?? null;
    const inserted = await tx.execute<{ id: number }>(
      sql`INSERT INTO workouts (title, template_id, workout_date, user_id, media)
          SELECT title, ${newTemplateId}, workout_date, ${targetId}, media
          FROM workouts WHERE id = ${workout.id} RETURNING id`,
    );
    const newWorkoutId = inserted.rows[0].id;

    const exercises = await tx.execute<{ id: number }>(
      sql`SELECT id FROM workout_exercises WHERE workout_id = ${workout.id} ORDER BY sort_order`,
    );
    for (const we of exercises.rows) {
      const weInserted = await tx.execute<{ id: number }>(
        sql`INSERT INTO workout_exercises (workout_id, exercise_id, superset_id, sort_order)
            SELECT ${newWorkoutId}, exercise_id, superset_id, sort_order
            FROM workout_exercises WHERE id = ${we.id} RETURNING id`,
      );
      await tx.execute(
        sql`INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed)
            SELECT ${weInserted.rows[0].id}, set_order, weight, reps, duration_sec, distance_m, completed
            FROM sets WHERE workout_exercise_id = ${we.id} ORDER BY set_order`,
      );
    }
  }

  // Замеры тела копируются одним запросом — ссылок на них ни у кого нет.
  await tx.execute(
    sql`INSERT INTO measurements (user_id, date, weight, chest, waist, biceps, thighs, calves, shoulders, neck)
        SELECT ${targetId}, date, weight, chest, waist, biceps, thighs, calves, shoulders, neck
        FROM measurements WHERE user_id = ${sourceId}`,
  );
}

/**
 * Создаёт одноразовый демо-аккаунт с копией данных каноничного `demo` и возвращает сессию для него.
 * Сначала подчищает просроченные демо, затем в одной транзакции создаёт пользователя и клонирует данные.
 */
export async function startDemoSession(): Promise<SessionUser> {
  await purgeExpiredDemos();
  const sourceId = await getSourceUserId();

  // Имя генерируется случайно; при (маловероятной) коллизии ON CONFLICT вернёт 0 строк — пробуем снова.
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = randomDemoUsername();
    const created = await db.transaction(async (tx): Promise<SessionUser | null> => {
      const { rows } = await tx.execute<{ id: number }>(
        sql`INSERT INTO users (username, password_hash, role)
            VALUES (${username}, ${DUMMY_HASH}, 'demo')
            ON CONFLICT (username) DO NOTHING RETURNING id`,
      );
      if (!rows.length) return null;
      const id = rows[0].id;
      await cloneUserData(tx, id, sourceId);
      return { id, username, role: 'demo' };
    });
    if (created) return created;
  }

  throw new Error('demo: could not allocate a unique username');
}

