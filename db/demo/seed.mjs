// Наполняет канонического демо-пользователя GymCore (username = 'demo') данными: три шаблона программ,
// история тренировок за 12 недель и замеры тела. Это ИСТОЧНИК, из которого кнопка «Демо» клонирует
// одноразовый аккаунт (см. src/lib/demo.ts). Локальный запуск — npm run db:demo:seed.
//
//   node db/demo/seed.mjs --dry-run          → показать план, ничего не писать
//   npm run db:demo:seed                     → записать в локальную базу
//   node db/demo/seed.mjs --yes              → записать в не-локальную (прод) базу
//   npm run db:demo:seed -- --reset          → дополнительно удалить все demo+* аккаунты
//
// Идемпотентно: данные демо-пользователя полностью пересоздаются в одной транзакции.
// Таблицы exercises и чужие данные не трогаются; отсутствующие упражнения НЕ создаются (сид падает).
import {
  assertWriteAllowed,
  connect,
  dbTarget,
  hasFlag,
  requireDatabaseUrl,
} from '../i18n/_shared.mjs';
import { buildDemoDataset } from './demo-data.mjs';

const DEMO_USERNAME = 'demo';
// Хеш от неизвестной строки: в канонический демо-аккаунт нельзя войти паролем (вход — только кнопкой
// «Демо»). Тот же хеш, что в src/actions/auth.ts (DUMMY_HASH).
const DUMMY_HASH = '$2b$10$VPBpDmh.ujQihm60FsuAROCJArKB864otv3GUnNtSeGl3QMtguu1i';

const url = requireDatabaseUrl();
const dryRun = hasFlag('dry-run');
const reset = hasFlag('reset');
const target = dbTarget(url);
assertWriteAllowed({ target, dryRun, confirmed: hasFlag('yes'), command: 'db:demo:seed' });

const dataset = buildDemoDataset();
const exerciseNames = [
  ...new Set(
    [...dataset.templates, ...dataset.workouts].flatMap((row) => row.exercises.map((exercise) => exercise.name)),
  ),
];
const setCount = dataset.workouts.reduce(
  (sum, workout) => sum + workout.exercises.reduce((inner, exercise) => inner + exercise.sets.length, 0),
  0,
);

console.log('Демо-датасет (Push/Pull/Legs, 12 недель):');
console.log(`  шаблоны:           ${dataset.templates.length}`);
console.log(`  тренировки:        ${dataset.workouts.length} (подходов ${setCount})`);
console.log(`  замеры:            ${dataset.measurements.length}`);
console.log(`  упражнений нужно:  ${exerciseNames.length}`);
console.log(`База: ${target.label}${target.isLocal ? ' (локальная)' : ' (ВНИМАНИЕ: не локальная)'}`);

/** Пишет упражнения родителя (шаблон/тренировка) и их подходы; имя → id берётся из `resolved`. */
async function insertExercises(client, { owner, parentId, exercises, resolved, completed = false }) {
  const isTemplate = owner === 'template';
  for (const row of exercises) {
    const exerciseId = resolved.get(row.name);
    if (exerciseId == null) continue; // в dry-run без полного набора упражнений просто пропускаем
    const { rows } = await client.query(
      isTemplate
        ? 'INSERT INTO template_exercises (template_id, exercise_id, sort_order, superset_id) VALUES ($1,$2,$3,$4) RETURNING id'
        : 'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, superset_id) VALUES ($1,$2,$3,$4) RETURNING id',
      [parentId, exerciseId, row.sortOrder, row.supersetId],
    );
    const parentRowId = rows[0].id;
    for (const set of row.sets) {
      await client.query(
        isTemplate
          ? 'INSERT INTO template_sets (template_exercise_id, set_order, weight, reps) VALUES ($1,$2,$3,$4)'
          : 'INSERT INTO sets (workout_exercise_id, set_order, weight, reps, completed) VALUES ($1,$2,$3,$4,$5)',
        isTemplate
          ? [parentRowId, set.setOrder, set.weight, set.reps]
          : [parentRowId, set.setOrder, set.weight, set.reps, completed],
      );
    }
  }
}

const client = await connect(url);
try {
  const { rows: tables } = await client.query(
    "SELECT to_regclass('public.templates') AS t, to_regclass('public.workouts') AS w, to_regclass('public.measurements') AS m",
  );
  if (!tables[0].t || !tables[0].w || !tables[0].m) {
    console.error('Нет нужных таблиц — сначала выполните npm run db:setup');
    process.exit(1);
  }

  // Сопоставление имён упражнений с id (регистр и крайние пробелы не важны).
  const { rows: exercises } = await client.query('SELECT id, btrim(name) AS name FROM exercises');
  const idByName = new Map();
  for (const exercise of exercises) {
    const key = (exercise.name ?? '').trim().toLowerCase();
    if (key && !idByName.has(key)) idByName.set(key, exercise.id);
  }
  const resolved = new Map(); // имя → id
  const missing = [];
  for (const name of exerciseNames) {
    const id = idByName.get(name.trim().toLowerCase());
    if (id == null) missing.push(name);
    else resolved.set(name, id);
  }
  if (missing.length) {
    console.error(`! не найдены упражнения (${missing.length}) — сид пишет только данные, но НЕ создаёт упражнения:`);
    for (const name of missing) console.error(`  · ${name}`);
    console.error('Проверьте названия в db/demo/demo-data.mjs (должны точно совпадать с exercises.name).');
    if (!dryRun) process.exit(1);
  }

  // Демо-пользователь: создаём или помечаем ролью demo (пароль существующего не перезаписываем).
  // dry-run: пользователя вставляем в транзакции и тут же откатываем — «показать план» не пишет в БД.
  if (dryRun) await client.query('BEGIN');
  const { rows: demoUser } = await client.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'demo')
     ON CONFLICT (username) DO UPDATE SET role = 'demo'
     RETURNING id`,
    [DEMO_USERNAME, DUMMY_HASH],
  );
  const demoId = demoUser[0].id;
  console.log(`Демо-пользователь '${DEMO_USERNAME}' → id ${demoId}`);

  if (dryRun) {
    await client.query('ROLLBACK');
    console.log('[dry-run] в БД ничего не записано');
  } else {
    await client.query('BEGIN');
    try {
      // Полная пересборка данных демо-пользователя (каскады удаляют дочерние строки).
      await client.query('DELETE FROM workouts WHERE user_id = $1', [demoId]);
      await client.query('DELETE FROM templates WHERE user_id = $1', [demoId]);
      await client.query('DELETE FROM measurements WHERE user_id = $1', [demoId]);

      const templateIdByName = new Map();
      for (const template of dataset.templates) {
        const { rows } = await client.query(
          'INSERT INTO templates (name, description, user_id, is_public) VALUES ($1, $2, $3, false) RETURNING id',
          [template.name, template.description, demoId],
        );
        templateIdByName.set(template.name, rows[0].id);
        await insertExercises(client, { owner: 'template', parentId: rows[0].id, exercises: template.exercises, resolved });
      }

      for (const workout of dataset.workouts) {
        const { rows } = await client.query(
          'INSERT INTO workouts (title, template_id, workout_date, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
          [workout.title, templateIdByName.get(workout.templateName) ?? null, workout.date, demoId],
        );
        await insertExercises(client, {
          owner: 'workout',
          parentId: rows[0].id,
          exercises: workout.exercises,
          resolved,
          completed: true,
        });
      }

      for (const row of dataset.measurements) {
        await client.query(
          `INSERT INTO measurements (user_id, date, weight, chest, waist, biceps, thighs, calves, shoulders, neck)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [demoId, row.date, row.weight, row.chest, row.waist, row.biceps, row.thighs, row.calves, row.shoulders, row.neck],
        );
      }

      if (reset) await client.query("DELETE FROM users WHERE username LIKE 'demo+%'");
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(
      `✔ demo: записано шаблонов ${dataset.templates.length}, тренировок ${dataset.workouts.length}, замеров ${dataset.measurements.length}${reset ? '; demo+* удалены' : ''}.`,
    );
  }
} finally {
  await client.end();
}

