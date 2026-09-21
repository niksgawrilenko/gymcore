// Сессия = подписанный JWT в httpOnly-cookie (JS в браузере его не видит, в отличие от localStorage).
import { jwtVerify, SignJWT } from 'jose';

export type SessionUser = { id: number; username: string; role: string };

export const SESSION_COOKIE = 'gymcore_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET не задан');
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return { id: Number(payload.sub), username: String(payload.username), role: String(payload.role ?? 'user') };
  } catch {
    return null;
  }
}
