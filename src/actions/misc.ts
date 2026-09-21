'use server';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { exercises, measurements, templates } from '@/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth';
import { getExerciseProgress } from '@/lib/data';
import { fail, ok, type ActionResult } from './_shared';

// ---------- Замеры тела ----------

const MEASUREMENT_FIELDS = ['weight', 'chest', 'waist', 'biceps', 'thighs', 'calves', 'shoulders', 'neck'] as const;

export async function addMeasurement(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const values: Partial<Record<(typeof MEASUREMENT_FIELDS)[number], string | null>> = {};
  for (const f of MEASUREMENT_FIELDS) {
    const raw = String(formData.get(f) ?? '').replace(',', '.').trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 999.99) return fail('Некорректное значение');
    values[f] = String(n);
  }
  if (Object.keys(values).length === 0) return fail('Заполните хотя бы один параметр!');
  await db.insert(measurements).values({ ...values, userId: user.id, date: new Date() });
  revalidatePath('/measurements');
  return ok(undefined);
}

export async function deleteMeasurement(id: number) {
  const user = await requireUser();
  await db.delete(measurements).where(and(eq(measurements.id, id), eq(measurements.userId, user.id)));
  revalidatePath('/measurements');
}

// ---------- Модерация ----------

export async function moderate(type: 'exercise' | 'template', id: number, approve: boolean) {
  await requireAdmin();
  const table = type === 'exercise' ? exercises : templates;
  await db
    .update(table)
    .set(approve ? { moderationStatus: 'approved', isPublic: true } : { moderationStatus: 'rejected' })
    .where(eq(table.id, id));
  revalidatePath('/admin');
}

// ---------- Статистика ----------

export async function loadExerciseProgress(name: string) {
  const user = await requireUser();
  return getExerciseProgress(user.id, name);
}

// ---------- Медиа: подпись для прямой загрузки в Cloudinary ----------
// Файл летит из браузера сразу в Cloudinary (не через наш сервер — у Vercel лимит тела 4.5 МБ).
// Сервер только подписывает параметры, поэтому чужие не могут заливать файлы в твой аккаунт.

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic,mp4,mov';
const FOLDER = 'gymcore_media';

export async function signUpload(): Promise<
  ActionResult<{ cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; allowedFormats: string }>
> {
  await requireUser();
  const { CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return fail('Загрузка медиа не настроена');

  const timestamp = Math.floor(Date.now() / 1000);
  // Параметры в алфавитном порядке + секрет -> SHA-1 (формат подписи Cloudinary)
  const toSign = `allowed_formats=${ALLOWED_FORMATS}&folder=${FOLDER}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(toSign + CLOUDINARY_API_SECRET).digest('hex');

  return ok({ cloudName: CLOUDINARY_NAME, apiKey: CLOUDINARY_API_KEY, timestamp, signature, folder: FOLDER, allowedFormats: ALLOWED_FORMATS });
}
