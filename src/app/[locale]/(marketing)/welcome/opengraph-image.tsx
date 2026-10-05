import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'GymCore — free workout journal';

// Image for social networks and messengers. Drawn in code, so no separate assets are needed.
// The text depends on the route locale (/ru/welcome -> Russian).
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ru = locale === 'ru';
  const [line1, line2] = ru ? ['Дневник тренировок', 'бесплатно и без рекламы'] : ['Workout journal', 'free and ad-free'];
  const sub = ru
    ? 'Подходы · статистика · замеры · ИИ-тренер · без подписок'
    : 'Sets · stats · measurements · AI coach · no subscriptions';
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #007aff 0%, #0040a0 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 38, opacity: 0.85, display: 'flex' }}>GymCore</div>
        <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.1, marginTop: 18, display: 'flex' }}>
          {line1}
        </div>
        <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.1, display: 'flex' }}>
          {line2}
        </div>
        <div style={{ fontSize: 33, opacity: 0.9, marginTop: 34, display: 'flex' }}>
          {sub}
        </div>
      </div>
    ),
    size,
  );
}
