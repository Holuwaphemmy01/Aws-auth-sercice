import { getUserByEmail, putUser, updateLoginMeta } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { signAccessToken, signRefreshToken } from '../lib/jwt';
import { safeParseRegister, safeParseLogin } from '../lib/validation';


export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const resp = (statusCode: number, body: unknown): LambdaResponse => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});


export const register = async (event: any): Promise<LambdaResponse> => {
  try {
    if (!event?.body) return resp(400, { message: 'Request body is missing' });

    let body: unknown;
    try {
      body = JSON.parse(event.body);
    } catch (e: any) {
      return resp(400, { message: 'Invalid JSON payload' });
    }

    const data = safeParseRegister(body);
    if (!data || !data.email || !data.password) {
      return resp(400, { message: 'Invalid input' });
    }

    const exists = await getUserByEmail(data.email);
    if (exists) return resp(409, { message: 'User already exists', errorCode: 'USER_EXISTS' });

    const password_hash = await hashPassword(data.password);
    await putUser({
      email: data.email,
      name: data.name ?? '',
      password_hash,
    });

    return resp(201, { message: 'Registered successfully' });
  } catch (err: any) {
    console.error({
      level: 'error',
      msg: 'register_failed',
      err: err?.message ?? String(err),
    });
    return resp(500, { message: 'Internal server error', errorCode: 'INTERNAL_ERROR' });
  }
};

/**
 * login handler
 * Expects event.body = JSON string { email, password }
 */
export const login = async (event: any): Promise<LambdaResponse> => {
  try {
    if (!event?.body) return resp(400, { message: 'Request body is missing' });

    let body: unknown;
    try {
      body = JSON.parse(event.body);
    } catch (e: any) {
      return resp(400, { message: 'Invalid JSON payload' });
    }

    const data = safeParseLogin(body);
    if (!data || !data.email || !data.password) {
      return resp(400, { message: 'Invalid input' });
    }

    const user = await getUserByEmail(data.email);
    if (!user) {
      return resp(401, { message: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    }

    const ok = await verifyPassword(data.password, user.password_hash);
    if (!ok) {
      try {
        await updateLoginMeta(user.email, { failedLoginCount: (user.failedLoginCount ?? 0) + 1 });
      } catch (e) {
        console.warn('failed to update login meta', (e as Error).message);
      }
      return resp(401, { message: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    }

    const accessToken = await signAccessToken({ sub: user.email });
    const refreshToken = await signRefreshToken({ sub: user.email });

    try {
      await updateLoginMeta(user.email, { lastLoginAt: new Date().toISOString(), failedLoginCount: 0 });
    } catch (e) {
      console.warn('failed to update login meta', (e as Error).message);
    }

    return resp(200, { accessToken, refreshToken });
  } catch (err: any) {
    console.error({
      level: 'error',
      msg: 'login_failed',
      err: err?.message ?? String(err),
    });
    return resp(500, { message: 'Internal server error', errorCode: 'INTERNAL_ERROR' });
  }
};
