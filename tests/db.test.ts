import { register, login } from '../src/handlers/auth';
import * as db from '../src/lib/db';

jest.mock('../src/lib/db');
jest.mock('../src/lib/crypto', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_pw'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/lib/jwt', () => ({
  signAccessToken: jest.fn().mockResolvedValue('mockAccessToken'),
  signRefreshToken: jest.fn().mockResolvedValue('mockRefreshToken'),
}));
jest.mock('../src/lib/validation', () => ({
  safeParseRegister: jest.fn((body) => body),
  safeParseLogin: jest.fn((body) => body),
}));

const mockEvent = (body: any) => ({
  version: '2.0',
  routeKey: 'POST /auth',
  rawPath: '/auth',
  rawQueryString: '',
  headers: {},
  requestContext: { requestId: 'mockReq' },
  isBase64Encoded: false,
  body: JSON.stringify(body),
});

describe('authHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    (db.getUserByEmail as jest.Mock).mockResolvedValue(undefined);
    (db.putUser as jest.Mock).mockResolvedValue(true);

    const event = mockEvent({
      email: 'test@example.com',
      password: '12345',
      name: 'John',
    });

    const result: any = await register(event);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body).message).toBe('Registered successfully');
  });

  it('should return 409 if user already exists', async () => {
    (db.getUserByEmail as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

    const event = mockEvent({
      email: 'test@example.com',
      password: '12345',
      name: 'John',
    });

    const result: any = await register(event);

    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).errorCode).toBe('USER_EXISTS');
  });

  it('should login successfully with valid credentials', async () => {
    (db.getUserByEmail as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      password_hash: 'hashed_pw',
      name: 'John',
    });

    const event = mockEvent({
      email: 'test@example.com',
      password: '12345',
    });

    const result: any = await login(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('should return 401 if credentials are invalid', async () => {
    (db.getUserByEmail as jest.Mock).mockResolvedValue(undefined);

    const event = mockEvent({
      email: 'nope@example.com',
      password: 'wrong',
    });

    const result: any = await login(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).errorCode).toBe('INVALID_CREDENTIALS');
  });
});
