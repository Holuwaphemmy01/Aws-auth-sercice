import { register, login } from '../src/handlers/auth';
import * as db from '../src/lib/db';
import * as crypto from '../src/lib/crypto';
import * as jwt from '../src/lib/jwt';
import * as validation from '../src/lib/validation';

jest.mock('../src/lib/db');
jest.mock('../src/lib/crypto');
jest.mock('../src/lib/jwt');
jest.mock('../src/lib/validation');

describe('Auth Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      (validation.safeParseRegister as jest.Mock).mockReturnValue({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      (db.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (crypto.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      (db.putUser as jest.Mock).mockResolvedValue(undefined);

      const event = { body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test User' }) };
      const result = await register(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Registered successfully');
      expect(db.putUser).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashedPassword',
      }));
    });

    it('should not allow duplicate registration', async () => {
      (validation.safeParseRegister as jest.Mock).mockReturnValue({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      (db.getUserByEmail as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      const event = { body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test User' }) };
      const result = await register(event);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.errorCode).toBe('USER_EXISTS');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const user = { email: 'test@example.com', password_hash: 'hashedPassword', failedLoginCount: 0 };
      (validation.safeParseLogin as jest.Mock).mockReturnValue({ email: 'test@example.com', password: 'password123' });
      (db.getUserByEmail as jest.Mock).mockResolvedValue(user);
      (crypto.verifyPassword as jest.Mock).mockResolvedValue(true);
      (jwt.signAccessToken as jest.Mock).mockResolvedValue('accessToken');
      (jwt.signRefreshToken as jest.Mock).mockResolvedValue('refreshToken');
      (db.updateLoginMeta as jest.Mock).mockResolvedValue(undefined);

      const event = { body: JSON.stringify({ email: 'test@example.com', password: 'password123' }) };
      const result = await login(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.accessToken).toBe('accessToken');
      expect(body.refreshToken).toBe('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      const user = { email: 'test@example.com', password_hash: 'hashedPassword', failedLoginCount: 0 };
      (validation.safeParseLogin as jest.Mock).mockReturnValue({ email: 'test@example.com', password: 'wrongpassword' });
      (db.getUserByEmail as jest.Mock).mockResolvedValue(user);
      (crypto.verifyPassword as jest.Mock).mockResolvedValue(false);
      (db.updateLoginMeta as jest.Mock).mockResolvedValue(undefined);

      const event = { body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }) };
      const result = await login(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.errorCode).toBe('INVALID_CREDENTIALS');
    });
  });
});
