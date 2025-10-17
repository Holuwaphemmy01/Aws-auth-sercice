// import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
// import { getUserByEmail, putUser, updateLoginMeta } from '../lib/db.js';
// import { hashPassword, verifyPassword } from '../lib/crypto.js';
// import { signAccessToken, signRefreshToken } from '../lib/jwt.js';
// import { safeParseRegister, safeParseLogin } from '../lib/validation.js';

// export const register: APIGatewayProxyHandlerV2 = async (event) => {
//   try {
//     const body = JSON.parse(event.body ?? '{}');
//     const data = safeParseRegister(body);

//     const exists = await getUserByEmail(data.email);
//     if (exists) return resp(409, { message: 'User exists' });

//     const password_hash = await hashPassword(data.password);
//     await putUser({ email: data.email, name: data.name, password_hash });

//     console.log(JSON.stringify({ event: 'user_registered', email: data.email }));
//     return resp(201, { message: 'Registered' });
//   } catch (e) {
//     console.error(JSON.stringify({ level: 'error', msg: 'register_failed', err: (e as Error).message }));
//     return resp(400, { message: 'Invalid payload' });
//   }
// };

// export const login: APIGatewayProxyHandlerV2 = async (event) => {
//   const now = new Date().toISOString();
//   try {
//     const body = JSON.parse(event.body ?? '{}');
//     const data = safeParseLogin(body);

//     const user = await getUserByEmail(data.email);
//     if (!user || !(await verifyPassword(data.password, user.password_hash))) {
//       console.warn(JSON.stringify({ event: 'login_failed', email: data.email }));
//       return resp(401, { message: 'Invalid credentials' });
//     }

//     const accessToken = await signAccessToken({ sub: user.email });
//     const refreshToken = await signRefreshToken({ sub: user.email });

//     await updateLoginMeta(user.email, { lastLoginAt: now, failedLoginCount: 0 });

//     console.log(JSON.stringify({ event: 'login_success', email: user.email }));
//     return resp(200, { accessToken, refreshToken });
//   } catch (e) {
//     console.error(JSON.stringify({ level: 'error', msg: 'login_failed', err: (e as Error).message }));
//     return resp(400, { message: 'Invalid payload' });
//   }
// };

// const resp = (statusCode: number, body: unknown) => ({
//   statusCode,
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(body),
// });



import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getUserByEmail, putUser, updateLoginMeta } from '../lib/db.js';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { signAccessToken, signRefreshToken } from '../lib/jwt.js';
import { safeParseRegister, safeParseLogin } from '../lib/validation.js';

export const register: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event.body) {
      return resp(400, { message: 'Request body is missing' });
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'register_failed', err: (e as Error).message }));
      return resp(400, { message: 'Invalid JSON payload' });
    }

    const data = safeParseRegister(body);
    if (!data || !data.email || !data.password) {
      return resp(400, { message: 'Invalid input' });
    }

    const exists = await getUserByEmail(data.email);
    if (exists) {
      return resp(409, { message: 'User already exists', errorCode: 'USER_EXISTS' });
    }

    const password_hash = await hashPassword(data.password);
    await putUser({
      email: data.email,
      name: data.name,
      password_hash,
      // Optionally pass condition to putUser to prevent overwrites
    });

    console.log(JSON.stringify({ event: 'user_registered', email: data.email, requestId: event.requestContext.requestId }));
    return resp(201, { message: 'Registered successfully' });
  } catch (e) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'register_failed',
      err: (e as Error).message,
      stack: (e as Error).stack,
      requestId: event.requestContext.requestId,
    }));
    return resp(500, { message: 'Internal server error', errorCode: 'INTERNAL_ERROR' });
  }
};

export const login: APIGatewayProxyHandlerV2 = async (event) => {
  const now = new Date().toISOString();
  try {
    if (!event.body) {
      return resp(400, { message: 'Request body is missing' });
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'login_failed', err: (e as Error).message }));
      return resp(400, { message: 'Invalid JSON payload' });
    }

    const data = safeParseLogin(body);
    if (!data || !data.email || !data.password) {
      return resp(400, { message: 'Invalid input' });
    }

    const user = await getUserByEmail(data.email);
    if (!user) {
      console.warn(JSON.stringify({ event: 'login_failed', email: data.email, reason: 'user_not_found' }));
      // Optionally increment failedLoginCount for non-existent user
      return resp(401, { message: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    }

    const isPasswordValid = await verifyPassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      console.warn(JSON.stringify({ event: 'login_failed', email: data.email, reason: 'invalid_password' }));
      await updateLoginMeta(user.email, {
        failedLoginCount: (user.failedLoginCount || 0) + 1,
      });
      return resp(401, { message: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    }

    const accessToken = await signAccessToken({ sub: user.email });
    const refreshToken = await signRefreshToken({ sub: user.email });

    await updateLoginMeta(user.email, { lastLoginAt: now, failedLoginCount: 0 });

    console.log(JSON.stringify({ event: 'login_success', email: user.email, requestId: event.requestContext.requestId }));
    return resp(200, { accessToken, refreshToken });
  } catch (e) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'login_failed',
      err: (e as Error).message,
      stack: (e as Error).stack,
      requestId: event.requestContext.requestId,
    }));
    return resp(500, { message: 'Internal server error', errorCode: 'INTERNAL_ERROR' });
  }
};

const resp = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Adjust for your CORS requirements
  },
  body: JSON.stringify(body),
});