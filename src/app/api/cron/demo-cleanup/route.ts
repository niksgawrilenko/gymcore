import { NextResponse, type NextRequest } from 'next/server';
import { purgeExpiredDemos } from '@/lib/demo';

// Vercel Cron calls this on a schedule (see vercel.json). Protected by the CRON_SECRET bearer token that
// Vercel sends when the env var is set; runs outside the i18n matcher (path starts with /api).
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const removed = await purgeExpiredDemos();
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
