import { hashPassword, verifyPassword } from '../src/lib/crypto';

describe('Crypto Library', () => {
  const password = 'SecurePass123!';
  let hash: string;

  it('should hash a password successfully', async () => {
    hash = await hashPassword(password);
    expect(hash).toMatch(/^\$2[aby]\$.{56}$/);
  });

  it('should verify a correct password', async () => {
    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const valid = await verifyPassword('wrong', hash);
    expect(valid).toBe(false);
  });
});
