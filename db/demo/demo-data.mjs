// Канонический датасет демо-аккаунта GymCore (только данные, без доступа к БД).
// Генерирует правдоподобную историю Push/Pull/Legs за 12 недель, три шаблона программ и замеры тела.
// Даты считаются относительно момента запуска, поэтому демо всегда выглядит «живым» (календарь, «за месяц»).
// db/demo/seed.mjs сопоставляет имена упражнений с id в БД и записывает строки.
//
// Имена упражнений — точные exercises.name из прод-базы (иначе сид создаст «свои» приватные упражнения).

const DAY_MS = 24 * 60 * 60 * 1000;

// Программа. `weight` — стартовый рабочий вес (кг), `step` — недельная прибавка, `reps` — целевые
// повторы за подход (число или массив под «лестницу»). Упражнения с собственным весом: weight = null.
// `superset` — метка суперсета (упражнения с одинаковой меткой идут подряд как суперсет).
const PROGRAM = [
  {
    template: 'Push Day',
    description: 'Chest, shoulders and triceps — heavy pressing first, then isolation.',
    weekday: 1, // понедельник
    exercises: [
      { name: 'Жим штанги лёжа', sets: 4, reps: [10, 8, 8, 6], weight: 70, step: 1.25 },
      { name: 'Жим гантелей на наклонной скамье', sets: 3, reps: 10, weight: 24, step: 1 },
      { name: 'Разведение гантелей на наклонной скамье', sets: 3, reps: 12, weight: 12, step: 0.5 },
      { name: 'Махи гантелей в стороны сидя', sets: 3, reps: 15, weight: 8, step: 0.5, superset: 'S1' },
      { name: 'Разгибания рук на верхнем блоке с канатом', sets: 3, reps: 12, weight: 25, step: 0.5, superset: 'S1' },
    ],
  },
  {
    template: 'Pull Day',
    description: 'Back and biceps — vertical pulls, then rows and arm work.',
    weekday: 3, // среда
    exercises: [
      { name: 'Подтягивания широким хватом к груди', sets: 4, reps: [8, 8, 7, 6], weight: null, step: 0 },
      { name: 'Тяга штанги в наклоне', sets: 4, reps: 10, weight: 60, step: 1.25 },
      { name: 'Тяга нижнего блока к поясу сидя', sets: 3, reps: 12, weight: 55, step: 1 },
      { name: 'Шраги с гантелями стоя', sets: 3, reps: 15, weight: 30, step: 1 },
      { name: 'Подъем штанги на бицепс стоя', sets: 3, reps: 12, weight: 30, step: 0.5, superset: 'S1' },
      { name: 'Упражнение "Молот" (Хаммеры) с гантелями', sets: 3, reps: 12, weight: 14, step: 0.5, superset: 'S1' },
    ],
  },
  {
    template: 'Leg Day',
    description: 'Squat pattern, hinge, calves and a hanging-leg-raise finisher.',
    weekday: 5, // пятница
    exercises: [
      { name: 'Приседания со штангой', sets: 4, reps: [10, 8, 8, 6], weight: 90, step: 2 },
      { name: 'Жим ногами в тренажёре', sets: 3, reps: 12, weight: 140, step: 2.5 },
      { name: 'Румынская тяга со штангой', sets: 3, reps: 10, weight: 80, step: 2 },
      { name: 'Подъём на носки в тренажёре стоя', sets: 4, reps: 15, weight: 50, step: 1 },
      { name: 'Подъем ног в висе на перекладине', sets: 3, reps: 12, weight: null, step: 0 },
    ],
  },
];

const WEEKS = 12;

const round2 = (value) => Math.round(value * 100) / 100;
const roundHalf = (value) => Math.round(value * 2) / 2;

/** Понедельник недели, в которую попадает дата (в UTC, 00:00). */
function mondayOf(date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (day.getUTCDay() + 6) % 7; // getUTCDay: 0=вс … 6=сб
  return new Date(day.getTime() - daysSinceMonday * DAY_MS);
}

/** Подходы одного упражнения для недели `week` (0..WEEKS-1): вес растёт линейно, повторы — по плану. */
function buildSets(exercise, week) {
  const reps = Array.isArray(exercise.reps)
    ? exercise.reps
    : Array.from({ length: exercise.sets }, () => exercise.reps);
  return reps.map((target, index) => ({
    setOrder: index,
    reps: target,
    weight: exercise.weight == null ? null : roundHalf(exercise.weight + exercise.step * week),
  }));
}

/** Замеры тела: 14 недельных точек от `count-1` недель назад до сейчас (на графике виден прогресс). */
function buildMeasurements(now, count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 → старт, 1 → сегодня
    const date = new Date(now.getTime() - (count - 1 - i) * 7 * DAY_MS);
    const wobble = Math.sin(i * 1.7) * 0.4; // правдоподобный шум
    rows.push({
      date,
      weight: round2(80 - 3 * t + wobble),
      chest: round2(104 + 3 * t),
      waist: round2(89 - 4 * t),
      biceps: round2(37.5 + 1.5 * t),
      thighs: round2(59 + 1.5 * t),
      calves: round2(38 + 0.5 * t),
      shoulders: round2(121 + 3 * t),
      neck: round2(39 + 0.5 * t),
    });
  }
  return rows;
}

/**
 * Полный датасет демо-аккаунта.
 * @returns {{ templates: object[], workouts: object[], measurements: object[] }}
 */
export function buildDemoDataset(now = new Date()) {
  const templates = PROGRAM.map((day) => ({
    name: day.template,
    description: day.description,
    exercises: day.exercises.map((exercise, sortOrder) => ({
      name: exercise.name,
      sortOrder,
      supersetId: exercise.superset ?? null,
      sets: buildSets(exercise, 0), // шаблон хранит нагрузку нулевой недели
    })),
  }));

  const monday = mondayOf(now);
  const workouts = [];
  for (let week = 0; week < WEEKS; week++) {
    const weekMonday = new Date(monday.getTime() - (WEEKS - 1 - week) * 7 * DAY_MS);
    PROGRAM.forEach((day, index) => {
      if ((week * 3 + index) % 7 === 3) return; // детерминированный «пропуск» ≈ раз в две недели
      const date = new Date(weekMonday.getTime() + (day.weekday - 1) * DAY_MS + 18 * 3600_000 + 30 * 60_000);
      if (date.getTime() > now.getTime()) return; // будущие тренировки не пишем
      workouts.push({
        title: day.template,
        templateName: day.template,
        date,
        exercises: day.exercises.map((exercise, sortOrder) => ({
          name: exercise.name,
          sortOrder,
          supersetId: exercise.superset ?? null,
          sets: buildSets(exercise, week),
        })),
      });
    });
  }

  return { templates, workouts, measurements: buildMeasurements(now, 14) };
}

