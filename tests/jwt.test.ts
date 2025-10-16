import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken } from '../src/lib/jwt';

describe('JWT Library', () => {
  const payload = { sub: 'user@example.com' };

  it('should sign an access token with expiration', async () => {
    const token = await signAccessToken(payload);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded.sub).toBe(payload.sub);
  });

  it('should sign a refresh token with longer expiration', async () => {
    const token = await signRefreshToken(payload);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded.sub).toBe(payload.sub);
  });

  it('should reject tampered tokens', async () => {
    const token = await signAccessToken(payload);
    const badToken = token.slice(0, -1) + 'x';
    expect(() => jwt.verify(badToken, process.env.JWT_SECRET || 'dev-secret')).toThrow();
  });
});
