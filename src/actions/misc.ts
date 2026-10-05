'use server';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { exercises, measurements, templates } from '@/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth';
import { getExerciseProgress } from '@/lib/data';
import { allowRequest, RATE_LIMITS } from '@/lib/rate-limit';
import { fail, ok, type ActionResult } from './_shared';

// ---------- Body measurements ----------

const MEASUREMENT_FIELDS = ['weight', 'chest', 'waist', 'biceps', 'thighs', 'calves', 'shoulders', 'neck'] as const;

export async function addMeasurement(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const values: Partial<Record<(typeof MEASUREMENT_FIELDS)[number], string | null>> = {};
  for (const f of MEASUREMENT_FIELDS) {
    const raw = String(formData.get(f) ?? '').replace(',', '.').trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 999.99) return fail('invalidMeasurement');
    values[f] = String(n);
  }
  if (Object.keys(values).length === 0) return fail('measurementEmpty');
  await db.insert(measurements).values({ ...values, userId: user.id, date: new Date() });
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function deleteMeasurement(id: number) {
  const user = await requireUser();
  await db.delete(measurements).where(and(eq(measurements.id, id), eq(measurements.userId, user.id)));
  revalidatePath('/', 'layout');
}

// ---------- Moderation ----------

export async function moderate(type: 'exercise' | 'template', id: number, approve: boolean) {
  await requireAdmin();
  const table = type === 'exercise' ? exercises : templates;
  await db
    .update(table)
    .set(approve ? { moderationStatus: 'approved', isPublic: true } : { moderationStatus: 'rejected' })
    .where(eq(table.id, id));
  revalidatePath('/', 'layout');
}

// ---------- Stats ----------

export async function loadExerciseProgress(id: number) {
  const user = await requireUser();
  return getExerciseProgress(user.id, id);
}

// ---------- Media: signature for a direct upload to Cloudinary ----------
// The file goes from the browser straight to Cloudinary (not through our server — Vercel caps bodies at 4.5 MB).
// The server only signs the parameters, so nobody can upload into someone else's account.

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic,mp4,mov';
const FOLDER = 'gymcore_media';

export async function signUpload(): Promise<
  ActionResult<{ cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; allowedFormats: string }>
> {
  const user = await requireUser();
  // Every signature can be turned into an upload that spends the operator's Cloudinary quota.
  if (!allowRequest(`upload:${user.id}`, RATE_LIMITS.uploadUser)) return fail('uploadLimit');
  const { CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return fail('mediaNotConfigured');

  const timestamp = Math.floor(Date.now() / 1000);
  // Parameters in alphabetical order + secret -> SHA-1 (the Cloudinary signature format)
  const toSign = `allowed_formats=${ALLOWED_FORMATS}&folder=${FOLDER}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(toSign + CLOUDINARY_API_SECRET).digest('hex');

  return ok({ cloudName: CLOUDINARY_NAME, apiKey: CLOUDINARY_API_KEY, timestamp, signature, folder: FOLDER, allowedFormats: ALLOWED_FORMATS });
}
